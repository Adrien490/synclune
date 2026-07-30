import { DiscountType } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { BusinessError } from "@/shared/lib/actions";
import { checkDiscountEligibility } from "@/modules/discounts/services/discount-eligibility.service";
import {
	calculateDiscountWithExclusion,
	type CartItemForDiscount,
} from "@/modules/discounts/services/discount-calculation.service";
import { calculateShipping } from "@/modules/orders/services/shipping.service";
import { generateOrderNumber } from "@/modules/orders/services/order-generation.service";
import type { ShippingCountry } from "@/shared/constants/countries";
import { DISCOUNT_ERROR_MESSAGES } from "@/modules/discounts/constants/discount.constants";
import { DEFAULT_CURRENCY, STRIPE_MIN_AMOUNT_EUR_CENTS } from "@/shared/constants/currency";
import { getValidImageUrl } from "@/shared/lib/media-validation";
import { pickPrimaryImage } from "@/modules/products/services/product-display.service";
import { normalizeEmail } from "@/shared/utils/normalize-email";
import type { getSkuDetails } from "@/modules/cart/services/sku-validation.service";
import * as Sentry from "@sentry/nextjs";

// CHECKOUT-TOTAL-005 : un cartItem sans skuDetailsResult correspondant signifie que
// le subtotal (calculé par computeCartSubtotal sur les mêmes données) peut inclure
// un article qui ne serait pas snapshoté — fail-closed, jamais de skip silencieux
// sur un chemin de facturation.
const CART_ITEM_MISMATCH_ERROR =
	"Certains articles de ton panier sont introuvables. Actualise la page.";

function isDiscountType(value: string): value is DiscountType {
	return value === DiscountType.PERCENTAGE || value === DiscountType.FIXED_AMOUNT;
}

type SkuDetailsResult = Awaited<ReturnType<typeof getSkuDetails>>;

export interface CreateOrderParams {
	cartItems: Array<{ skuId: string; quantity: number }>;
	skuDetailsResults: SkuDetailsResult[];
	subtotal: number;
	shippingAddress: {
		addressLine1: string;
		addressLine2?: string | null;
		postalCode: string;
		city: string;
		country: string;
		phoneNumber?: string | null;
	};
	firstName: string;
	lastName: string;
	userId: string | null;
	finalEmail: string | null;
	discountCode?: string;
	paymentIntentId?: string;
}

interface CreateOrderResult {
	order: { id: string; orderNumber: string; total: number };
	appliedDiscountId: string | null;
	discountAmount: number;
	appliedDiscountCode: string | null;
}

/**
 * Creates an order atomically inside a Prisma transaction.
 *
 * Verifies stock with FOR UPDATE row locking, applies discount code, and
 * creates the order + order items + discount usage record in a single transaction.
 *
 * **Optimistic stock reservation**: Stock is verified (FOR UPDATE) but NOT decremented here.
 * The actual inventory decrement happens in the Stripe webhook handler
 * (`webhooks/services/checkout.service.ts` → `processOrderAtomically`) after payment
 * confirmation. This means two concurrent orders for the last item can both pass
 * verification, but only the first will succeed at webhook processing — the second
 * fails the webhook's own FOR UPDATE re-validation with an `OversellError`.
 *
 * ⚠️ Le perdant a DÉJÀ encaissé son paiement Stripe. Il n'est PAS récupéré par
 * `cleanup-pending-orders` (ce cron exclut les commandes avec `stripePaymentIntentId`).
 * C'est `handlePaymentSuccess` → `handleOversell` (ORD-STRIPE-009) qui le rembourse
 * automatiquement + marque la commande FAILED (libérant le code promo). Ce trade-off
 * évite la logique de rollback complexe et est acceptable au volume actuel.
 *
 * **Pas d'entrée OrderHistory à la création (délibéré)** : une commande PENDING n'est
 * pas encore une pièce comptable (ni facture, ni encaissement), et
 * `cleanupFailedCheckout` peut la hard-delete si l'update du PI échoue — une entrée
 * d'audit posée ici deviendrait orpheline (`OrderHistory.order` est `onDelete:
 * SetNull`). La première entrée d'audit trail est posée à la transition PAID par le
 * webhook (`createOrderAuditTx`, BIZ-BUG-003), dans la même transaction que le
 * décrément de stock.
 *
 * Called from confirmCheckout before Stripe PI update.
 * On Stripe failure, the caller is responsible for rolling back via cleanupFailedCheckout.
 */
export async function createOrderInTransaction(
	params: CreateOrderParams,
): Promise<CreateOrderResult> {
	const {
		cartItems,
		skuDetailsResults,
		subtotal,
		shippingAddress,
		firstName,
		lastName,
		userId,
		finalEmail,
		discountCode,
		paymentIntentId,
	} = params;

	// CHECKOUT-TOTAL-005 : invariant interne — le `subtotal` paramètre (pré-calculé
	// hors transaction par computeCartSubtotal) doit égaler la somme des lignes qui
	// seront réellement snapshotées ci-dessous (mêmes skuDetailsResults). Toute
	// divergence (filtrage, arrondi) produirait un Order dont
	// total ≠ Σ items + livraison − remise, indétectable en aval. Vérification pure,
	// AVANT la transaction — aucun lock tenu si elle échoue.
	let computedSubtotal = 0;
	for (const cartItem of cartItems) {
		const skuResult = skuDetailsResults.find((r) => r.success && r.data?.sku.id === cartItem.skuId);
		if (!skuResult?.success || !skuResult.data) {
			throw new BusinessError(CART_ITEM_MISMATCH_ERROR);
		}
		computedSubtotal += skuResult.data.sku.priceInclTax * cartItem.quantity;
	}
	if (computedSubtotal !== subtotal) {
		// Bug interne (pas une erreur client) → Sentry, puis rejet fail-closed.
		Sentry.withScope((scope) => {
			scope.setLevel("error");
			scope.setTag("checkout", "subtotal-mismatch");
			scope.setFingerprint(["order-creation", "subtotal-mismatch"]);
			scope.setContext("checkout", { subtotal, computedSubtotal });
			Sentry.captureMessage(
				"createOrderInTransaction: subtotal param diverges from line items sum",
				"error",
			);
		});
		throw new BusinessError("Le montant de ton panier a changé. Actualise la page.");
	}

	return prisma.$transaction(
		async (tx) => {
			// Verify stock with row locking to prevent race conditions (double-sell, oversell).
			// Lock SKUs in a deterministic order (sorted by skuId) so two concurrent checkouts
			// sharing the same SKUs in a different cart order can never deadlock (40P01) on the
			// FOR UPDATE row locks — Postgres would otherwise abort one and fail the checkout.
			const lockOrderedItems = [...cartItems].sort((a, b) => a.skuId.localeCompare(b.skuId));
			for (const cartItem of lockOrderedItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId,
				);
				// Défense en profondeur : déjà garanti par la vérification pré-transaction
				// (CHECKOUT-TOTAL-005) — fail-closed si le code amont évolue.
				if (!skuResult?.success || !skuResult.data) {
					throw new BusinessError(CART_ITEM_MISMATCH_ERROR);
				}

				const sku = skuResult.data.sku;
				// `deletedAt` (SKU et produit) fait partie de la relecture : la
				// re-validation du webhook les vérifie, celle-ci les OMETTAIT. Un SKU
				// soft-deleted entre l'ajout au panier et le checkout produisait donc une
				// commande PENDING qui mourait plus tard en `OversellError` → encaissement
				// puis remboursement automatique, là où un refus propre ici évite le
				// débit. Asymétrie corrigée.
				const currentSkuRows = await tx.$queryRaw<
					Array<{
						isActive: boolean;
						inventory: number;
						productTitle: string;
						productStatus: string;
						skuDeletedAt: Date | null;
						productDeletedAt: Date | null;
						priceInclTax: number;
					}>
				>`
				SELECT
					ps."isActive",
					ps.inventory,
					p.title as "productTitle",
					p.status as "productStatus",
					ps."deletedAt" as "skuDeletedAt",
					p."deletedAt" as "productDeletedAt",
					ps."priceInclTax"
				FROM "ProductSku" ps
				INNER JOIN "Product" p ON ps."productId" = p.id
				WHERE ps.id = ${cartItem.skuId}
				FOR UPDATE
			`;

				if (currentSkuRows.length === 0) {
					throw new BusinessError(`Produit introuvable : ${sku.product.title}`);
				}

				const currentSku = currentSkuRows[0]!;
				if (currentSku.skuDeletedAt || currentSku.productDeletedAt) {
					throw new BusinessError(`Le produit ${currentSku.productTitle} n'est plus disponible`);
				}
				if (!currentSku.isActive || currentSku.productStatus !== "PUBLIC") {
					throw new BusinessError(`Le produit ${currentSku.productTitle} n'est plus disponible`);
				}
				if (currentSku.inventory < cartItem.quantity) {
					throw new BusinessError(`Stock insuffisant pour ${currentSku.productTitle}`);
				}
				// Le PRIX aussi est vérifié sous le verrou. Il ne l'était pas : le stock et le
				// statut étaient autoritaires-au-verrou, le prix restait autoritaire-à-la-
				// lecture-de-cache (`fetchSkuForValidation`, profil `checkout`). Le garde-fou
				// `priceAtAdd !== sku.priceInclTax` des 3 actions de paiement compare deux
				// valeurs issues de la MÊME lecture cachée : il ne peut pas détecter un cache
				// périmé, et `CHECKOUT-TOTAL-005` vérifie seulement la cohérence interne
				// (`computedSubtotal === subtotal`), les deux côtés dérivant de cette lecture.
				// Un changement de prix concurrent facturait donc l'ancien montant. Fail-closed,
				// comme pour le stock : on refuse plutôt que de sous-facturer.
				if (currentSku.priceInclTax !== sku.priceInclTax) {
					throw new BusinessError("Le prix d'un article a changé. Actualise ton panier.");
				}
			}

			// Generate order number and compute shipping cost
			const orderNumber = generateOrderNumber();
			const shippingCost = calculateShipping(
				shippingAddress.country as ShippingCountry,
				shippingAddress.postalCode,
			);

			if (shippingCost === null) {
				throw new BusinessError("Livraison non disponible pour cette zone (Corse, DOM-TOM)");
			}

			// Apply discount code atomically with FOR UPDATE lock
			let discountAmount = 0;
			let appliedDiscountId: string | null = null;
			let appliedDiscountCode: string | null = null;

			if (discountCode) {
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
						startsAt: Date;
						endsAt: Date | null;
						isActive: boolean;
					}>
				>`
				SELECT
					id, code, type, value,
					"minOrderAmount", "maxUsageCount", "maxUsagePerUser",
					"usageCount", "startsAt", "endsAt", "isActive"
				FROM "Discount"
				WHERE code = ${discountCode.toUpperCase()}
				AND "deletedAt" IS NULL
				FOR UPDATE
			`;

				if (discountRows.length === 0) {
					throw new BusinessError(DISCOUNT_ERROR_MESSAGES.NOT_FOUND);
				}

				const discount = discountRows[0]!;

				if (!isDiscountType(discount.type)) {
					throw new BusinessError(`Type de réduction inconnu : ${discount.type}`);
				}
				const discountType = discount.type;

				// Read usage counts directly in transaction to prevent stale cache reads.
				// Email is normalized (lowercase+trim) to avoid trivial guest bypass of
				// maxUsagePerUser via casing/whitespace (cf [[CHECKOUT-AUDIT-003]]).
				const normalizedEmail = finalEmail ? normalizeEmail(finalEmail) : null;
				let usageCounts: { userCount: number; emailCount: number } | undefined;
				if (discount.maxUsagePerUser) {
					let userCount = 0;
					let emailCount = 0;

					if (userId) {
						userCount = await tx.discountUsage.count({
							where: { discountId: discount.id, userId },
						});
					}
					if (normalizedEmail) {
						emailCount = await tx.discountUsage.count({
							where: { discountId: discount.id, order: { customerEmail: normalizedEmail } },
						});
					}

					usageCounts = { userCount, emailCount };
				}

				const eligibility = checkDiscountEligibility(
					{
						id: discount.id,
						code: discount.code,
						type: discountType,
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
						subtotal,
						userId: userId ?? undefined,
						customerEmail: normalizedEmail ?? undefined,
					},
					usageCounts,
				);

				if (!eligibility.eligible) {
					throw new BusinessError(eligibility.error ?? "Code promo invalide");
				}

				const cartItemsForDiscount: CartItemForDiscount[] = [];
				for (const cartItem of cartItems) {
					const skuResult = skuDetailsResults.find(
						(r) => r.success && r.data?.sku.id === cartItem.skuId,
					);
					if (skuResult?.success && skuResult.data) {
						cartItemsForDiscount.push({
							priceInclTax: skuResult.data.sku.priceInclTax,
							quantity: cartItem.quantity,
							compareAtPrice: skuResult.data.sku.compareAtPrice,
						});
					}
				}

				discountAmount = calculateDiscountWithExclusion({
					type: discountType,
					value: discount.value,
					cartItems: cartItemsForDiscount,
					excludeSaleItems: true,
				});
				discountAmount = Math.max(0, Math.min(discountAmount, subtotal));

				if (discountAmount > 0) {
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

			// Micro-entreprise: TVA non applicable (art. 293 B du CGI)
			// Seuil franchise TVA 2026 : 85 000 € (ventes de biens — cas Synclune) / 37 500 € (prestations)
			const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
			const taxAmount = 0;
			// MIN-AMOUNT-DIVERGE-01 : `total` est le montant AUTORITAIRE posé sur le PI
			// avant capture (confirm-checkout). Pas de plancher STRIPE_MIN_AMOUNT_EUR_CENTS
			// ici (contrairement à update-payment-amount qui clampe pour l'affichage) —
			// l'invariant qui le rend inutile : `shippingCost >= STRIPE_MIN_AMOUNT_EUR_CENTS`
			// (frais FR par défaut = 499 c, jamais null en métropole) ⇒ total >= shipping >= min.
			const total = Math.max(0, subtotalAfterDiscount + shippingCost);

			// Le rejet ci-dessous matérialise cet invariant au lieu de le documenter.
			// Il n'est atteignable qu'après l'introduction d'un port gratuit ou d'un tarif
			// < 50 c ; sans lui, ce jour-là, Stripe refusait l'`update` de `confirmCheckout`
			// (montant sous le minimum EUR) et le client voyait « Une erreur est survenue »
			// après un `cleanupFailedCheckout` — un cul-de-sac muet plutôt qu'un motif.
			// Surtout : PAS de clamp silencieux à 50 c, qui sur-facturerait le client sans
			// que rien ne le signale (le PI porterait 50 c, `order.total` autre chose).
			if (total < STRIPE_MIN_AMOUNT_EUR_CENTS) {
				Sentry.withScope((scope) => {
					scope.setLevel("error");
					scope.setTag("checkout", "total-below-stripe-minimum");
					scope.setFingerprint(["order-creation", "total-below-stripe-minimum"]);
					// Aucune PII : uniquement des montants.
					scope.setContext("checkout", {
						total,
						subtotalAfterDiscount,
						shippingCost,
						minimum: STRIPE_MIN_AMOUNT_EUR_CENTS,
					});
					Sentry.captureMessage(
						"createOrderInTransaction: order total below the Stripe EUR minimum — configuration issue",
						"error",
					);
				});
				throw new BusinessError(
					"Le montant de ta commande est trop faible pour être encaissé. Écris-nous, on règle ça.",
				);
			}

			// Create order with denormalized shipping address snapshot (legal compliance — immutable)
			const newOrder = await tx.order.create({
				data: {
					orderNumber,
					userId,
					subtotal,
					discountAmount,
					shippingCost,
					taxAmount,
					total,
					currency: DEFAULT_CURRENCY,
					customerEmail: normalizeEmail(finalEmail ?? ""),
					customerName: `${firstName} ${lastName}`.trim(),
					shippingFirstName: firstName,
					shippingLastName: lastName,
					shippingAddress1: shippingAddress.addressLine1,
					shippingAddress2: shippingAddress.addressLine2 ?? null,
					shippingPostalCode: shippingAddress.postalCode,
					shippingCity: shippingAddress.city,
					shippingCountry: shippingAddress.country as ShippingCountry,
					shippingPhone: shippingAddress.phoneNumber ?? "",
					status: "PENDING",
					paymentStatus: "PENDING",
					fulfillmentStatus: "UNFULFILLED",
					...(paymentIntentId && { stripePaymentIntentId: paymentIntentId }),
				},
			});

			// Create order items with denormalized product/SKU data
			for (const cartItem of cartItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId,
				);
				// Défense en profondeur : déjà garanti par la vérification pré-transaction
				// (CHECKOUT-TOTAL-005) — un skip silencieux ici facturerait un article
				// absent de la commande.
				if (!skuResult?.success || !skuResult.data) {
					throw new BusinessError(CART_ITEM_MISMATCH_ERROR);
				}

				const sku = skuResult.data.sku;
				const product = sku.product;
				// EINV-SNAPSHOT-MEDIA-001 : SSOT `pickPrimaryImage` (primaire IMAGE →
				// première IMAGE → null). Le motif précédent
				// `find((img) => img.isPrimary) ?? images[0]` est celui que CLAUDE.md
				// bannit : aveugle au `mediaType`, il figeait un `.mp4` dans
				// `productImageUrl`/`skuImageUrl` — snapshot immuable de rétention 10 ans,
				// rendu dans l'historique client ET dans le PDF de facture.
				// `getValidImageUrl` ne rattrape rien : il ne valide que HTTPS + domaine.
				// `null` ⇒ on n'écrit pas d'URL, plutôt qu'une vidéo.
				const primaryImage = pickPrimaryImage(sku.images);
				const imageUrl = getValidImageUrl(primaryImage?.url ?? null) ?? null;

				const colorsHex = sku.colors
					.map((c) => c.hex)
					.filter(Boolean)
					.join(",");
				// Micro-entreprise franchise TVA (art. 293 B CGI) : aucune TVA par ligne
				// n'est stockée. Le total ligne (HT = TTC) se dérive de price × quantity ;
				// la facture le recalcule dans buildInvoiceData() (taxRate=0).
				await tx.orderItem.create({
					data: {
						orderId: newOrder.id,
						productId: product.id,
						skuId: sku.id,
						productTitle: product.title,
						productDescription: product.description ?? null,
						productImageUrl: imageUrl,
						skuSku: sku.sku,
						skuColor: sku.colors.map((c) => c.name).join(" · ") || null,
						skuColorHexes: colorsHex || null,
						skuMaterial: sku.material ?? null,
						skuSize: sku.size ?? null,
						skuImageUrl: imageUrl,
						price: sku.priceInclTax,
						quantity: cartItem.quantity,
					},
				});
			}

			// Record discount usage for audit trail
			if (appliedDiscountId && discountAmount > 0) {
				await tx.discountUsage.create({
					data: {
						discountId: appliedDiscountId,
						orderId: newOrder.id,
						userId: userId ?? null,
						discountCode: appliedDiscountCode!,
						amountApplied: discountAmount,
					},
				});
			}

			return { order: newOrder, appliedDiscountId, discountAmount, appliedDiscountCode };
		},
		{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
	);
}
