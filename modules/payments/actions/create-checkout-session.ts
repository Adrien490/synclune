"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import { generateOrderNumber } from "@/modules/orders/services/order-generation.service";
import type { ShippingCountry } from "@/shared/constants/countries";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createCheckoutSessionSchema } from "@/modules/payments/schemas/create-checkout-session-schema";
import { parseFullName } from "@/modules/payments/utils/parse-full-name";
import type { CreateCheckoutSessionData } from "@/modules/payments/types/checkout.types";
// ALLOWED_SHIPPING_COUNTRIES n'est plus utilisé car shipping_address_collection est désactivé (embedded mode)
import { getShippingOptionsForAddress } from "@/modules/orders/constants/stripe-shipping-rates";
import { DISCOUNT_ERROR_MESSAGES } from "@/modules/discounts/constants/discount.constants";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";
import { checkDiscountEligibility } from "@/modules/discounts/services/discount-eligibility.service";
import { getDiscountUsageCounts } from "@/modules/discounts/data/get-discount-usage-counts";
import { calculateDiscountWithExclusion, type CartItemForDiscount } from "@/modules/discounts/services/discount-calculation.service";
import { getShippingZoneFromPostalCode } from "@/modules/orders/services/shipping-zone.service";
import { stripe, getInvoiceFooter } from "@/shared/lib/stripe";
import { getValidImageUrl } from "@/modules/payments/utils/validate-image-url";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import { validateInput, handleActionError, success, error, BusinessError } from "@/shared/lib/actions";

export const createCheckoutSession = async (_prevState: ActionState | undefined, formData: FormData) => {
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
		const rateLimit = await checkRateLimit(rateLimitId, PAYMENT_LIMITS.CREATE_SESSION, ipAddress);

		if (!rateLimit.success) {
			return {
				...error(rateLimit.error || "Trop de tentatives de paiement. Veuillez réessayer plus tard."),
				data: {
					retryAfter: rateLimit.retryAfter,
					reset: rateLimit.reset,
				},
			};
		}

		// 3. Parser les données
		const cartItemsRaw = formData.get("cartItems") as string;
		const shippingAddressRaw = formData.get("shippingAddress") as string;
		const email = (formData.get("email") as string) || undefined;
		const discountCode = (formData.get("discountCode") as string) || undefined;

		let cartItems, shippingAddress;
		try {
			cartItems = JSON.parse(cartItemsRaw);
			shippingAddress = JSON.parse(shippingAddressRaw);
		} catch {
			return error("Format JSON invalide pour les donnees du panier.");
		}

		const rawData: CreateCheckoutSessionData = {
			cartItems,
			shippingAddress,
			email,
			discountCode,
		};

		// 4. Validation
		const validated = validateInput(createCheckoutSessionSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 5. Validation guest checkout
		const finalEmail = validatedData.email || userEmail;
		if (!userId && !finalEmail) {
			return error("L'email est requis pour une commande invite.");
		}

		// Parser fullName en firstName/lastName pour Stripe et la base de données
		const { firstName, lastName } = parseFullName(validatedData.shippingAddress.fullName);

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
						name: `${firstName} ${lastName}`.trim(),
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
			} catch (e) {
				// Distinguer erreurs permanentes (email invalide) vs transitoires (réseau)
				if (e instanceof Stripe.errors.StripeInvalidRequestError) {
					// Erreur permanente : email invalide, données incorrectes
					return error("Email invalide pour la creation du profil client.");
				}
				// Erreur transitoire (réseau, timeout) : continuer sans customer Stripe
				// Le checkout fonctionnera mais sans customer_id pré-rempli
				// Le customer sera créé par Stripe automatiquement si nécessaire
				stripeCustomerId = null;
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
			return error("Certains articles ne sont plus disponibles.");
		}

		// 6b. Vérifier la cohérence des prix (panier vs prix actuel)
		for (const cartItem of validatedData.cartItems) {
			const skuResult = skuDetailsResults.find(
				(r) => r.success && r.data?.sku.id === cartItem.skuId
			);
			if (!skuResult?.success || !skuResult.data) continue;

			if (cartItem.priceAtAdd !== skuResult.data.sku.priceInclTax) {
				return error(
					"Les prix de certains articles ont changé. Actualisez votre panier avant de procéder au paiement."
				);
			}
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

			// P1.3: Valider l'URL de l'image avant envoi à Stripe
			const imageUrl = getValidImageUrl(sku.images?.[0]?.url);

			lineItems.push({
				price_data: {
					currency: DEFAULT_CURRENCY,
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
		const orderResult = await prisma.$transaction(async (tx) => {
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
					throw new BusinessError(`Produit introuvable : ${sku.product.title}`);
				}

				const currentSku = currentSkuRows[0];

				if (!currentSku.isActive) {
					throw new BusinessError(
						`Le produit ${currentSku.productTitle} n'est plus disponible`
					);
				}

				if (currentSku.productStatus !== "PUBLIC") {
					throw new BusinessError(
						`Le produit ${currentSku.productTitle} n'est plus disponible`
					);
				}

				if (currentSku.inventory < cartItem.quantity) {
					throw new BusinessError(
						`Stock insuffisant pour ${currentSku.productTitle}`
					);
				}
			}

			// 8b. Générer numéro de commande
			const orderNumber = generateOrderNumber();

			const shippingZoneInfo = getShippingZoneFromPostalCode(
				validatedData.shippingAddress.postalCode
			);

			// 8c. Calculer les frais de livraison selon le pays et la zone (Corse = 10€)
			const shippingCost = calculateShipping(
				validatedData.shippingAddress.country as ShippingCountry,
				validatedData.shippingAddress.postalCode
			);

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
					AND "deletedAt" IS NULL
					FOR UPDATE
				`;

				if (discountRows.length === 0) {
					throw new BusinessError(DISCOUNT_ERROR_MESSAGES.NOT_FOUND);
				}

				const discount = discountRows[0];

				// Fetch per-user usage counts before eligibility check (I/O outside service)
				const usageCounts = discount.maxUsagePerUser
					? await getDiscountUsageCounts({
							discountId: discount.id,
							userId: userId || undefined,
							customerEmail: finalEmail || undefined,
						})
					: undefined;

				// Vérifier l'éligibilité (montant min, limites usage, dates)
				const eligibility = checkDiscountEligibility(
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
						startsAt: discount.startsAt,
						endsAt: discount.endsAt,
					},
					{
						subtotal, // Montant hors frais de port
						userId: userId || undefined,
						customerEmail: finalEmail || undefined,
					},
					usageCounts
				);

				if (!eligibility.eligible) {
					throw new BusinessError(eligibility.error || "Code promo invalide");
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
					// 🔴 UPDATE CONDITIONNEL ATOMIQUE : évite race condition sur maxUsageCount
					const updateResult = await tx.$executeRaw`
						UPDATE "Discount"
						SET "usageCount" = "usageCount" + 1
						WHERE id = ${discount.id}
							AND ("maxUsageCount" IS NULL OR "usageCount" < "maxUsageCount")
					`;
					if (updateResult === 0) {
						throw new BusinessError("Ce code promo a atteint sa limite d'utilisation");
					}

					appliedDiscountId = discount.id;
					appliedDiscountCode = discount.code;
				}
			}

			const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
			// Micro-entreprise : TVA non applicable (art. 293 B du CGI)
			const taxAmount = 0;
			const total = Math.max(0, subtotalAfterDiscount + shippingCost);

			// 8e. Créer la commande avec stock déjà réservé
			// Note: Montants temporaires - seront recalculés par Stripe Tax dans le webhook
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
					currency: DEFAULT_CURRENCY,

					// === INFORMATIONS CLIENT ===
					customerEmail: finalEmail || "",
					customerName: `${firstName} ${lastName}`.trim(),

					// === ADRESSE DE LIVRAISON (SNAPSHOT) ===
					shippingFirstName: firstName,
					shippingLastName: lastName,
					shippingAddress1: validatedData.shippingAddress.addressLine1,
					shippingAddress2: validatedData.shippingAddress.addressLine2 || null,
					shippingPostalCode: validatedData.shippingAddress.postalCode,
					shippingCity: validatedData.shippingAddress.city,
					shippingCountry: validatedData.shippingAddress.country || "FR",
					shippingPhone: validatedData.shippingAddress.phoneNumber || "",
					shippingMethod: "STANDARD",

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
				// P1.3: Valider l'URL avant stockage (cohérence avec envoi Stripe)
				const primaryImage = sku.images?.find((img) => img.isPrimary);
				const rawImageUrl = primaryImage?.url || sku.images?.[0]?.url || null;
				const imageUrl = getValidImageUrl(rawImageUrl) || null;

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
						discountCode: appliedDiscountCode!, // 🔴 SNAPSHOT: Code au moment de l'achat
						amountApplied: discountAmount, // 🔴 SNAPSHOT: Montant au moment de l'achat
					},
				});
			}

			return { order: newOrder, appliedDiscountId, discountAmount, appliedDiscountCode };
		});

		const { order, appliedDiscountId, discountAmount: orderDiscountAmount, appliedDiscountCode: orderDiscountCode } = orderResult;

		// Invalidate discount usage cache after successful checkout
		if (appliedDiscountId) {
			updateTag(DISCOUNT_CACHE_TAGS.USAGE(appliedDiscountId));
		}

		// 9. Créer un coupon Stripe si un code promo est appliqué
		// Nécessaire pour que Stripe facture le montant réduit (et que la facture soit correcte)
		let stripeCouponId: string | undefined;
		if (orderDiscountAmount > 0 && orderDiscountCode) {
			const coupon = await stripe.coupons.create({
				amount_off: orderDiscountAmount,
				currency: DEFAULT_CURRENCY,
				duration: "once",
				name: `Code promo ${orderDiscountCode}`,
			});
			stripeCouponId = coupon.id;
		}

		// 10. Créer la session Stripe Checkout
		// 🔴 CORRECTION CRITIQUE : Idempotency key pour éviter double facturation
		const idempotencyKey = `checkout-${order.id}`;

		const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL;

		let checkoutSession: Stripe.Checkout.Session;
		try {
			checkoutSession = await stripe.checkout.sessions.create(
			{
				mode: "payment",
				ui_mode: "embedded", // ✅ EMBEDDED CHECKOUT - Formulaire intégré sur le site
				// payment_method_types omitted: Stripe auto-enables all methods configured in Dashboard
				// (card, Apple Pay, Google Pay, Link, Klarna, Bancontact, iDEAL, etc.)
				line_items: lineItems,

				// Appliquer le coupon de réduction si un code promo est utilisé
				...(stripeCouponId && { discounts: [{ coupon: stripeCouponId }] }),

				// ❌ STRIPE TAX DÉSACTIVÉ - Micro-entreprise exonérée de TVA (art. 293 B du CGI)
				// Les prix sont des prix FINAUX sans TVA
				// Si passage en régime réel TVA (> 91 900€/an), réactiver automatic_tax
				// automatic_tax: {
				// 	enabled: true,
				// },

				// 🔴 CORRECTION CRITIQUE : Utiliser stripeCustomerId si disponible
				customer: stripeCustomerId || undefined,
				customer_email: !stripeCustomerId ? (finalEmail || undefined) : undefined,

				// ✅ SHIPPING OPTIONS (IDs créés dans Dashboard Stripe)
				// Filtrage par pays ET code postal (Corse détectée côté backend) :
				// - France métro : 6€
				// - Corse : 10€
				// - Europe (dont Monaco) : 15€
				// ℹ️ Micro-entreprise : Prix FINAUX sans TVA
				shipping_options: getShippingOptionsForAddress(
					validatedData.shippingAddress.country as ShippingCountry,
					validatedData.shippingAddress.postalCode
				),

				// ❌ DÉSACTIVÉ - Adresse collectée via notre formulaire, pas Stripe
				// shipping_address_collection: { allowed_countries: [...] },

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
					...(sessionId && { guestSessionId: sessionId }), // Pour vider le panier invite apres paiement
				},
				// 🔴 EXPIRATION SESSION : 30 minutes pour libérer rapidement le stock réservé
				// Stripe recommande entre 30min et 24h pour les produits à stock limité
				// Pour bijoux haute valeur : 30min = bon équilibre entre UX et gestion stock
				expires_at: Math.floor(Date.now() / 1000) + (60 * 30), // 30 minutes from now

				// ✅ EMBEDDED MODE : return_url remplace success_url/cancel_url
				return_url: `${baseUrl}/paiement/retour?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,

				locale: "fr",
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
						footer: getInvoiceFooter(),
					},
				},
			},
			{
				// 🔴 IDEMPOTENCY KEY : Même orderId = même session Stripe
				// Protège contre double-clic, timeout réseau, refresh page
				idempotencyKey,
			}
		);
		} catch (stripeError) {
			// 🔴 CLEANUP : Supprimer l'order orphelin si création session Stripe échoue
			// L'order a été créé mais le paiement est impossible sans session
			await prisma.order.delete({
				where: { id: order.id },
			});
			// Annuler l'usage du code promo si applicable
			if (validatedData.discountCode) {
				await prisma.discount.updateMany({
					where: { code: validatedData.discountCode.toUpperCase() },
					data: { usageCount: { decrement: 1 } },
				});
				await prisma.discountUsage.deleteMany({
					where: { orderId: order.id },
				});
			}
			// Supprimer le coupon Stripe orphelin
			if (stripeCouponId) {
				await stripe.coupons.del(stripeCouponId).catch(() => {});
			}
			// Re-throw pour que handleActionError le traite
			throw stripeError;
		}

		// Vérifier que Stripe a bien retourné un client_secret (requis pour embedded mode)
		if (!checkoutSession.client_secret) {
			throw new BusinessError("Session Stripe créée sans client_secret. Veuillez réessayer.");
		}

		// Invalider le cache du panier après création de commande réussie
		const cartTags = getCartInvalidationTags(userId || undefined, sessionId || undefined);
		cartTags.forEach(tag => updateTag(tag));

		return success("Session de paiement creee avec succes.", {
			clientSecret: checkoutSession.client_secret, // EMBEDDED MODE : clientSecret pour initialiser le formulaire
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la creation de la session de paiement.");
	}
};
