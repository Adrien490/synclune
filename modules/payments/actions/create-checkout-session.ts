"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getSkuDetails } from "@/modules/cart/lib/sku-validation";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "@/modules/addresses/constants/cache";
import {
	getFinalShippingCost,
	calculateTaxAmount,
} from "@/modules/orders/constants/shipping";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createCheckoutSessionSchema, type CreateCheckoutSessionData } from "@/modules/payments/schemas/create-checkout-session-schema";
import { sendNewsletterConfirmationEmail } from "@/shared/lib/email";
import { randomUUID } from "crypto";
import { ALLOWED_SHIPPING_COUNTRIES } from "@/modules/orders/constants/colissimo-rates";
import { getStripeShippingOptions } from "@/modules/orders/constants/stripe-shipping-rates";
import { DISCOUNT_ERROR_MESSAGES } from "@/modules/discounts/constants/discount.constants";
import { checkDiscountEligibility } from "@/modules/discounts/utils/check-discount-eligibility";
import { calculateDiscountWithExclusion, type CartItemForDiscount } from "@/modules/discounts/utils/calculate-discount-amount";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Départements métropolitains français
const FRENCH_METROPOLITAN_DEPARTMENTS = [
	"01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
	"11", "12", "13", "14", "15", "16", "17", "18", "19", "21",
	"22", "23", "24", "25", "26", "27", "28", "29", "2A", "2B",
	"30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
	"40", "41", "42", "43", "44", "45", "46", "47", "48", "49",
	"50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
	"60", "61", "62", "63", "64", "65", "66", "67", "68", "69",
	"70", "71", "72", "73", "74", "75", "76", "77", "78", "79",
	"80", "81", "82", "83", "84", "85", "86", "87", "88", "89",
	"90", "91", "92", "93", "94", "95",
] as const;

function getShippingZoneFromPostalCode(postalCode: string): {
	zone: "METROPOLITAN" | "CORSE" | "DOM" | "TOM" | "UNKNOWN";
	department: string;
} {
	const department = postalCode.substring(0, 2);

	if (department === "2A" || department === "2B") {
		return { zone: "CORSE", department };
	}

	if (department === "97") {
		return { zone: "DOM", department: postalCode.substring(0, 3) };
	}

	if (department === "98") {
		return { zone: "TOM", department: postalCode.substring(0, 3) };
	}

	if (FRENCH_METROPOLITAN_DEPARTMENTS.includes(department as typeof FRENCH_METROPOLITAN_DEPARTMENTS[number])) {
		return { zone: "METROPOLITAN", department };
	}

	return { zone: "UNKNOWN", department };
}

export const createCheckoutSession = async (_: unknown, formData: FormData) => {
	try {
		// 1. Récupération de l'utilisateur connecté (optionnel)
		const session = await getSession();
		const userId = session?.user?.id || null;
		const userEmail = session?.user?.email || null;

		// Récupérer le stripeCustomerId depuis la base de données si l'utilisateur est connecté
		let stripeCustomerId: string | null = null;
		if (userId) {
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { stripeCustomerId: true },
			});
			stripeCustomerId = user?.stripeCustomerId || null;
		}

		// 2. Rate limiting (protection anti-abus API Stripe)
		const sessionId = !userId ? await getOrCreateCartSessionId() : null;
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);

		const rateLimitId = getRateLimitIdentifier(userId, sessionId || null, ipAddress);
		const rateLimit = checkRateLimit(rateLimitId, PAYMENT_LIMITS.CREATE_SESSION);

		if (!rateLimit.success) {
			return {
				status: ActionStatus.ERROR,
				message: rateLimit.error || "Trop de tentatives de paiement. Veuillez réessayer plus tard.",
				data: {
					retryAfter: rateLimit.retryAfter,
					reset: rateLimit.reset,
				},
			};
		}

		// 3. Parser les données
		const cartItemsRaw = formData.get("cartItems") as string;
		const shippingAddressRaw = formData.get("shippingAddress") as string;
		const billingAddressRaw = formData.get("billingAddress") as string;
		const email = (formData.get("email") as string) || undefined;
		const saveAddress = formData.get("saveAddress") === "true" || formData.get("saveAddress") === "on";
		const newsletter = formData.get("newsletter") === "true";
		const discountCode = (formData.get("discountCode") as string) || undefined;

		let cartItems, shippingAddress, billingAddress;
		try {
			cartItems = JSON.parse(cartItemsRaw);
			shippingAddress = JSON.parse(shippingAddressRaw);
			billingAddress = billingAddressRaw ? JSON.parse(billingAddressRaw) : undefined;
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format JSON invalide pour les données du panier.",
				validationErrors: { cartItems: ["Format JSON invalide"] },
			};
		}

		const rawData: CreateCheckoutSessionData = {
			cartItems,
			shippingAddress,
			billingAddress,
			email,
			newsletter,
			discountCode,
		};

		// 4. Validation
		const validation = createCheckoutSessionSchema.safeParse(rawData);
		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Validation échouée. Veuillez vérifier votre saisie.",
				validationErrors: validation.error.flatten().fieldErrors,
			};
		}

		const validatedData = validation.data;

		// 5. Validation guest checkout
		const finalEmail = validatedData.email || userEmail;
		if (!userId && !finalEmail) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "L'email est requis pour une commande invité.",
				validationErrors: { email: ["L'email est requis pour les invités"] },
			};
		}

		// 🔴 NOUVEAU : Créer customer Stripe SYSTÉMATIQUEMENT si absent
		// Obligatoire pour génération automatique de factures
		if (!stripeCustomerId && finalEmail) {
			try {
// console.log(`🔨 [CHECKOUT] Creating Stripe customer for ${finalEmail}...`);

				// 🔴 IDEMPOTENCY KEY (Best Practice Stripe 2025)
				// Protège contre double-clic, timeout réseau, retry automatique
				// Clé basée sur email = même customer retourné pendant 24h
				const customerIdempotencyKey = `customer-create-${finalEmail}`;

				const customer = await stripe.customers.create(
					{
						email: finalEmail,
						name: `${validatedData.shippingAddress.firstName} ${validatedData.shippingAddress.lastName}`,
						address: {
							line1: validatedData.shippingAddress.addressLine1,
							line2: validatedData.shippingAddress.addressLine2 || undefined,
							postal_code: validatedData.shippingAddress.postalCode,
							city: validatedData.shippingAddress.city,
							country: validatedData.shippingAddress.country || 'FR',
						},
						phone: validatedData.shippingAddress.phoneNumber || undefined,
						metadata: {
							source: 'checkout_b2c',
							createdFrom: 'synclune-bijoux',
						},
					},
					{ idempotencyKey: customerIdempotencyKey }
				);

				stripeCustomerId = customer.id;
// console.log(`✅ [CHECKOUT] Stripe customer created: ${customer.id}`);

				// Mettre à jour l'utilisateur si connecté
				if (userId) {
					await prisma.user.update({
						where: { id: userId },
						data: { stripeCustomerId: customer.id },
					});
// console.log(`✅ [CHECKOUT] User ${userId} updated with stripeCustomerId`);
				}
			} catch (error) {
// console.error("❌ [CHECKOUT] Error creating Stripe customer:", error);
				return {
					status: ActionStatus.ERROR,
					message: "Échec de création du profil client. Veuillez réessayer.",
				};
			}
		}

		// Note: On permet volontairement le guest checkout même si un compte existe
		// Car l'utilisateur peut ne pas avoir son mot de passe ou préférer commander en invité
		// La commande sera associée à l'utilisateur via l'email lors du webhook Stripe

		// 6. Charger les détails des SKUs et vérifier stock
		const skuIds = validatedData.cartItems.map((item) => item.skuId);
		const skuDetailsResults = await Promise.all(
			skuIds.map((skuId) => getSkuDetails({ skuId }))
		);

		// Vérifier les erreurs
		const failedSkus = skuDetailsResults.filter((result) => !result.success);
		if (failedSkus.length > 0) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Certains articles ne sont plus disponibles.",
				validationErrors: {
					cartItems: ["Un ou plusieurs articles ne sont plus disponibles"],
				},
			};
		}

		// 7. Préparer les line items Stripe (sans vérification stock pour l'instant)
		const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
		let subtotal = 0;

		for (const cartItem of validatedData.cartItems) {
			const skuResult = skuDetailsResults.find(
				(r) => r.success && r.data?.sku.id === cartItem.skuId
			);

			if (!skuResult || !skuResult.success || !skuResult.data) {
				continue;
			}

			const sku = skuResult.data.sku;
			const product = sku.product;

			// Prix en centimes
			const unitAmount = sku.priceInclTax;
			subtotal += unitAmount * cartItem.quantity;

			// Construire le nom du produit avec variantes
			let productName = product.title;
			if (sku.size) productName += ` - Taille: ${sku.size}`;
			if (sku.material) productName += ` - ${sku.material}`;

			// Récupérer la première image du SKU
			const imageUrl = sku.images?.[0]?.url || undefined;

			lineItems.push({
				price_data: {
					currency: "EUR",
					product_data: {
						name: productName,
						images: imageUrl ? [imageUrl] : undefined,
						metadata: {
							skuId: sku.id,
							productId: product.id,
						},
						// ℹ️ Micro-entreprise : Pas de tax_code car exonérée de TVA (art. 293 B du CGI)
					},
					unit_amount: unitAmount, // Prix FINAL sans TVA (régime micro-entreprise)
					// ℹ️ Micro-entreprise : Pas de tax_behavior car pas de TVA
				},
				quantity: cartItem.quantity,
			});
		}

		// 8. 🔴 TRANSACTION ATOMIQUE : Vérifier stock + Créer commande
		// Cette transaction élimine la race condition entre vérif stock et création commande
		const order = await prisma.$transaction(async (tx) => {
			// 8a. Vérifier le stock pour chaque item
			for (const cartItem of validatedData.cartItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId
				);

				if (!skuResult || !skuResult.success || !skuResult.data) {
					continue;
				}

				const sku = skuResult.data.sku;

				// Vérifier que le SKU et le produit sont toujours actifs avec verrouillage
				const currentSkuRows = await tx.$queryRaw<
					Array<{
						isActive: boolean;
						inventory: number;
						productTitle: string;
						productStatus: string;
					}>
				>`
					SELECT
						ps."isActive",
						ps.inventory,
						p.title as "productTitle",
						p.status as "productStatus"
					FROM "ProductSku" ps
					INNER JOIN "Product" p ON ps."productId" = p.id
					WHERE ps.id = ${cartItem.skuId}
					FOR UPDATE
				`;

				if (currentSkuRows.length === 0) {
					throw new Error(`Produit introuvable : ${sku.product.title}`);
				}

				const currentSku = currentSkuRows[0];

				if (!currentSku.isActive) {
					throw new Error(
						`Le produit ${currentSku.productTitle} n'est plus disponible (SKU inactif)`
					);
				}

				if (currentSku.productStatus !== "PUBLIC") {
					throw new Error(
						`Le produit ${currentSku.productTitle} n'est plus disponible (statut: ${currentSku.productStatus})`
					);
				}

				if (currentSku.inventory < cartItem.quantity) {
					throw new Error(
						`Stock insuffisant pour ${currentSku.productTitle} (${cartItem.quantity} demandé, ${currentSku.inventory} disponible)`
					);
				}
			}

			// 8b. Générer numéro de commande
			const orderNumber = `CMD-${Date.now()}-${Math.random()
				.toString(36)
				.slice(2, 6)
				.toUpperCase()}`;

			const shippingZoneInfo = getShippingZoneFromPostalCode(
				validatedData.shippingAddress.postalCode
			);

			// 8c. Calculer les frais de livraison
			const shippingCost = getFinalShippingCost(subtotal);

			// 8d. 🔴 DISCOUNT ATOMIQUE : Valider et appliquer le code promo dans la transaction
			let discountAmount = 0;
			let appliedDiscountId: string | null = null;
			let appliedDiscountCode: string | null = null;

			if (validatedData.discountCode) {
				// Rechercher le discount avec verrouillage FOR UPDATE pour éviter race condition
				const discountRows = await tx.$queryRaw<
					Array<{
						id: string;
						code: string;
						type: string;
						value: number;
						minOrderAmount: number | null;
						maxUsageCount: number | null;
						maxUsagePerUser: number | null;
						usageCount: number;
						startsAt: Date; // Non-nullable car @default(now()) dans le schema
						endsAt: Date | null;
						isActive: boolean;
					}>
				>`
					SELECT
						id, code, type, value,
						"minOrderAmount", "maxUsageCount", "maxUsagePerUser",
						"usageCount", "startsAt", "endsAt", "isActive"
					FROM "Discount"
					WHERE code = ${validatedData.discountCode.toUpperCase()}
					FOR UPDATE
				`;

				if (discountRows.length === 0) {
					throw new Error(DISCOUNT_ERROR_MESSAGES.NOT_FOUND);
				}

				const discount = discountRows[0];

				// Vérifier l'éligibilité (montant min, limites usage)
				const eligibility = await checkDiscountEligibility(
					{
						id: discount.id,
						code: discount.code,
						type: discount.type as "PERCENTAGE" | "FIXED_AMOUNT",
						value: discount.value,
						minOrderAmount: discount.minOrderAmount,
						maxUsageCount: discount.maxUsageCount,
						maxUsagePerUser: discount.maxUsagePerUser,
						usageCount: discount.usageCount,
						isActive: discount.isActive,
					},
					{
						subtotal, // Montant hors frais de port
						userId: userId || undefined,
						customerEmail: finalEmail || undefined,
					}
				);

				if (!eligibility.eligible) {
					throw new Error(eligibility.error || "Code promo invalide");
				}

				// Préparer les items pour le calcul avec exclusion articles soldés
				const cartItemsForDiscount: CartItemForDiscount[] = [];
				for (const cartItem of validatedData.cartItems) {
					const skuResult = skuDetailsResults.find(
						(r) => r.success && r.data?.sku.id === cartItem.skuId
					);
					if (skuResult?.success && skuResult.data) {
						cartItemsForDiscount.push({
							priceInclTax: skuResult.data.sku.priceInclTax,
							quantity: cartItem.quantity,
							compareAtPrice: skuResult.data.sku.compareAtPrice,
						});
					}
				}

				// Calculer le montant avec exclusion des articles déjà soldés
				discountAmount = calculateDiscountWithExclusion({
					type: discount.type as "PERCENTAGE" | "FIXED_AMOUNT",
					value: discount.value,
					cartItems: cartItemsForDiscount,
					excludeSaleItems: true, // 🔴 Les articles soldés ne bénéficient pas du code promo
				});

				if (discountAmount > 0) {
					// 🔴 ATOMIQUE : Incrémenter le compteur d'utilisation
					await tx.discount.update({
						where: { id: discount.id },
						data: { usageCount: { increment: 1 } },
					});

					appliedDiscountId = discount.id;
					appliedDiscountCode = discount.code;
				}
			}

			const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
			const totalBeforeTax = subtotalAfterDiscount + shippingCost;
			const taxAmount = calculateTaxAmount(totalBeforeTax);
			// 🔴 SÉCURITÉ : Garantir que le total ne peut jamais être négatif
			const total = Math.max(0, totalBeforeTax + taxAmount);

			// 8e. Créer la commande avec stock déjà réservé
			// Note: Montants temporaires - seront recalculés par Stripe Tax dans le webhook
			const billingAddr = validatedData.billingAddress || validatedData.shippingAddress;

			const newOrder = await tx.order.create({
				data: {
					orderNumber,
					userId,

					// === MONTANTS (temporaires - mis à jour par webhook) ===
					subtotal,
					discountAmount,
					shippingCost,
					taxAmount,
					total,
					currency: "EUR",

					// === INFORMATIONS CLIENT ===
					customerEmail: finalEmail || "",
					customerName: `${validatedData.shippingAddress.firstName} ${validatedData.shippingAddress.lastName}`,

					// === ADRESSE DE LIVRAISON (SNAPSHOT) ===
					shippingFirstName: validatedData.shippingAddress.firstName,
					shippingLastName: validatedData.shippingAddress.lastName,
					shippingAddress1: validatedData.shippingAddress.addressLine1,
					shippingAddress2: validatedData.shippingAddress.addressLine2 || null,
					shippingPostalCode: validatedData.shippingAddress.postalCode,
					shippingCity: validatedData.shippingAddress.city,
					shippingCountry: validatedData.shippingAddress.country || "FR",
					shippingPhone: validatedData.shippingAddress.phoneNumber || "",
					shippingMethod:
						shippingZoneInfo.zone !== "UNKNOWN" ? shippingZoneInfo.zone : null,

					// === ADRESSE DE FACTURATION (SNAPSHOT) ===
					billingFirstName: billingAddr.firstName,
					billingLastName: billingAddr.lastName,
					billingAddress1: billingAddr.addressLine1,
					billingAddress2: billingAddr.addressLine2 || null,
					billingPostalCode: billingAddr.postalCode,
					billingCity: billingAddr.city,
					billingCountry: billingAddr.country || "FR",
					billingPhone: billingAddr.phoneNumber || null,

					// === STATUTS ===
					status: "PENDING",
					paymentStatus: "PENDING",
					fulfillmentStatus: "UNFULFILLED",
				},
			});

			// 8f. Créer les order items avec champs dénormalisés
			for (const cartItem of validatedData.cartItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId
				);

				if (!skuResult || !skuResult.success || !skuResult.data) continue;

				const sku = skuResult.data.sku;
				const product = sku.product;

				// Utiliser les données déjà chargées par getSkuDetails (évite un re-fetch)
				const primaryImage = sku.images?.find((img) => img.isPrimary);
				const imageUrl = primaryImage?.url || sku.images?.[0]?.url || null;

				await tx.orderItem.create({
					data: {
						orderId: newOrder.id,
						productId: product.id,
						skuId: sku.id,
						productTitle: product.title,
						productDescription: product.description || null,
						productImageUrl: imageUrl,
						skuColor: sku.color?.name || null,
						skuMaterial: sku.material || null,
						skuSize: sku.size || null,
						skuImageUrl: imageUrl,
						price: sku.priceInclTax,
						quantity: cartItem.quantity,
						// Détails fiscaux temporaires (mis à jour par webhook après calcul Stripe Tax)
						taxAmount: 0,
						taxRate: null,
					},
				});
			}

			// 8g. 🔴 Créer l'enregistrement DiscountUsage pour historisation (snapshot)
			if (appliedDiscountId && discountAmount > 0) {
				await tx.discountUsage.create({
					data: {
						discountId: appliedDiscountId,
						orderId: newOrder.id,
						userId: userId || null,
						amountApplied: discountAmount, // 🔴 SNAPSHOT: Montant au moment de l'achat
					},
				});
			}

			return newOrder;
		});

		// 8h. Inscrire à la newsletter si demandé
		if (newsletter && finalEmail) {
			try {
				// Vérifier si déjà inscrit
				const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
					where: { email: finalEmail },
				});

				if (!existingSubscriber || existingSubscriber.status !== "CONFIRMED") {
					// Créer ou réactiver l'inscription avec double opt-in
					const confirmationToken = randomUUID();

					if (existingSubscriber) {
						// Réactiver
						await prisma.newsletterSubscriber.update({
							where: { email: finalEmail },
							data: {
								confirmationToken,
								confirmationSentAt: new Date(),
								status: "PENDING",
								emailVerified: false,
								consentSource: "checkout_form",
								consentTimestamp: new Date(),
							},
						});
					} else {
						// Créer nouvel abonné
						const headersList = await headers();
						const ipAddress = (await getClientIp(headersList)) || "unknown";
						const userAgent = headersList.get("user-agent") || "unknown";

						await prisma.newsletterSubscriber.create({
							data: {
								email: finalEmail,
								ipAddress,
								userAgent,
								consentSource: "checkout_form",
								consentTimestamp: new Date(),
								confirmationToken,
								confirmationSentAt: new Date(),
								status: "PENDING",
								emailVerified: false,
							},
						});
					}

					// Envoyer email de confirmation
					const baseUrl = process.env.BETTER_AUTH_URL || "https://synclune.fr";
					const confirmationUrl = `${baseUrl}/newsletter/confirm?token=${confirmationToken}`;
					await sendNewsletterConfirmationEmail({
						to: finalEmail,
						confirmationUrl,
					});
				}
			} catch (newsletterError) {
				// Ne pas bloquer le checkout si l'inscription newsletter échoue
				// console.error("[NEWSLETTER_ERROR]", newsletterError);
			}
		}

		// 8i. Enregistrer l'adresse si demandé par l'utilisateur connecté
		const userIdForAddress = userId;
		if (userIdForAddress && saveAddress) {
			try {
				// Vérifier si l'utilisateur n'a pas déjà cette adresse
				const existingAddress = await prisma.address.findFirst({
					where: {
						userId: userIdForAddress,
						firstName: validatedData.shippingAddress.firstName,
						lastName: validatedData.shippingAddress.lastName,
						address1: validatedData.shippingAddress.addressLine1,
						postalCode: validatedData.shippingAddress.postalCode,
						city: validatedData.shippingAddress.city,
					},
				});

				if (!existingAddress) {
					// Compter les adresses existantes pour savoir si c'est la première
					const addressCount = await prisma.address.count({
						where: { userId: userIdForAddress },
					});

					// Créer la nouvelle adresse
					await prisma.address.create({
						data: {
							userId: userIdForAddress,
							firstName: validatedData.shippingAddress.firstName,
							lastName: validatedData.shippingAddress.lastName,
							address1: validatedData.shippingAddress.addressLine1,
							address2: validatedData.shippingAddress.addressLine2 || null,
							postalCode: validatedData.shippingAddress.postalCode,
							city: validatedData.shippingAddress.city,
							country: validatedData.shippingAddress.country || "FR",
							phone: validatedData.shippingAddress.phoneNumber || "",
							isDefault: addressCount === 0, // Première adresse = par défaut
						},
					});

					// Invalider le cache des adresses de l'utilisateur
					getUserAddressesInvalidationTags(userIdForAddress).forEach(tag => updateTag(tag));
				}
			} catch (addressError) {
				// Ne pas bloquer le checkout si l'enregistrement de l'adresse échoue
				// L'adresse pourra être ajoutée manuellement plus tard
// console.error("[SAVE_ADDRESS_ERROR]", addressError);
			}
		}

		// 9. Créer la session Stripe Checkout
		// 🔴 CORRECTION CRITIQUE : Idempotency key pour éviter double facturation
		const idempotencyKey = `checkout-${order.id}`;

		const checkoutSession = await stripe.checkout.sessions.create(
			{
				mode: "payment",
				payment_method_types: ["card"],
				line_items: lineItems,

				// ❌ STRIPE TAX DÉSACTIVÉ - Micro-entreprise exonérée de TVA (art. 293 B du CGI)
				// Les prix sont des prix FINAUX sans TVA
				// Si passage en régime réel TVA (> 91 900€/an), réactiver automatic_tax
				// automatic_tax: {
				// 	enabled: true,
				// },

				// 🔴 CORRECTION CRITIQUE : Utiliser stripeCustomerId si disponible
				customer: stripeCustomerId || undefined,
				customer_email: !stripeCustomerId ? (finalEmail || undefined) : undefined,

				// ✅ SHIPPING OPTIONS COLISSIMO (IDs créés dans Dashboard Stripe)
				// Stripe filtre automatiquement selon le pays du client :
				// - France : shr_france → 6€
				// - DOM-TOM : shr_domtom → 15€
				// - Europe : shr_europe → 15€
				//
				// Mondial Relay interdit pour bijoux - seul Colissimo est autorisé
				// ℹ️ Micro-entreprise : Prix FINAUX sans TVA
				shipping_options: getStripeShippingOptions(),

				// ✅ COLLECTE D'ADRESSE (France + 26 pays UE)
				shipping_address_collection: {
					allowed_countries: [...ALLOWED_SHIPPING_COUNTRIES] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
				},

				// ✅ MISE À JOUR AUTOMATIQUE CLIENT
				// Met à jour l'adresse du customer Stripe après validation
				customer_update: {
					shipping: "auto",
				},

				client_reference_id: order.id, // Pour retrouver la commande dans le webhook
				metadata: {
					orderId: order.id,
					orderNumber: order.orderNumber,
					userId: userId || "guest",
				},
				// 🔴 EXPIRATION SESSION : 30 minutes pour libérer rapidement le stock réservé
				// Stripe recommande entre 30min et 24h pour les produits à stock limité
				// Pour bijoux haute valeur : 30min = bon équilibre entre UX et gestion stock
				expires_at: Math.floor(Date.now() / 1000) + (60 * 30), // 30 minutes from now
				success_url: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL}/paiement/confirmation?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
				cancel_url: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL}/paiement/annulation?order_id=${order.id}`,
				locale: "fr",
				billing_address_collection: "auto",
				phone_number_collection: {
					enabled: true,
				},
				// ✅ Stripe génère automatiquement une facture PDF après paiement
				// Le client reçoit un email avec lien pour télécharger la facture
				invoice_creation: {
					enabled: true,
					invoice_data: {
						metadata: {
							orderNumber: order.orderNumber,
							orderId: order.id,
						},
						description: `Commande ${order.orderNumber}`,
					},
				},
			},
			{
				// 🔴 IDEMPOTENCY KEY : Même orderId = même session Stripe
				// Protège contre double-clic, timeout réseau, refresh page
				idempotencyKey,
			}
		);

		return {
			status: ActionStatus.SUCCESS,
			message: "Session de paiement créée avec succès.",
			data: {
				url: checkoutSession.url!,
				orderId: order.id,
				orderNumber: order.orderNumber,
			},
		};
	} catch (error) {
// console.error("[CREATE_CHECKOUT_SESSION]", error);

		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message:
					error.message ||
					"Une erreur est survenue lors de la création de la session de paiement.",
			};
		}

		return {
			status: ActionStatus.ERROR,
			message:
				"Une erreur est survenue lors de la création de la session de paiement.",
		};
	}
};
