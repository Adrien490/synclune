import { prisma } from "@/shared/lib/prisma";
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
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import { getValidImageUrl } from "@/shared/lib/media-validation";
import type { getSkuDetails } from "@/modules/cart/services/sku-validation.service";

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
}

export interface CreateOrderResult {
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
 * Called from createCheckoutSession before Stripe session creation.
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
	} = params;

	return prisma.$transaction(
		async (tx) => {
			// Verify stock with row locking to prevent race conditions (double-sell, oversell)
			for (const cartItem of cartItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId,
				);
				if (!skuResult?.success || !skuResult.data) continue;

				const sku = skuResult.data.sku;
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

				const currentSku = currentSkuRows[0]!;
				if (!currentSku.isActive || currentSku.productStatus !== "PUBLIC") {
					throw new BusinessError(`Le produit ${currentSku.productTitle} n'est plus disponible`);
				}
				if (currentSku.inventory < cartItem.quantity) {
					throw new BusinessError(`Stock insuffisant pour ${currentSku.productTitle}`);
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

				// Read usage counts directly in transaction to prevent stale cache reads
				let usageCounts: { userCount: number; emailCount: number } | undefined;
				if (discount.maxUsagePerUser) {
					let userCount = 0;
					let emailCount = 0;

					if (userId) {
						userCount = await tx.discountUsage.count({
							where: { discountId: discount.id, userId },
						});
					}
					if (finalEmail) {
						emailCount = await tx.discountUsage.count({
							where: { discountId: discount.id, order: { customerEmail: finalEmail } },
						});
					}

					usageCounts = { userCount, emailCount };
				}

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
						subtotal,
						userId: userId ?? undefined,
						customerEmail: finalEmail ?? undefined,
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
					type: discount.type as "PERCENTAGE" | "FIXED_AMOUNT",
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
			// Seuil franchise TVA 2024-2025 : 37 500 € (prestations) / 85 000 € (ventes)
			const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
			const taxAmount = 0;
			const total = Math.max(0, subtotalAfterDiscount + shippingCost);

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
					customerEmail: finalEmail ?? "",
					customerName: `${firstName} ${lastName}`.trim(),
					shippingFirstName: firstName,
					shippingLastName: lastName,
					shippingAddress1: shippingAddress.addressLine1,
					shippingAddress2: shippingAddress.addressLine2 ?? null,
					shippingPostalCode: shippingAddress.postalCode,
					shippingCity: shippingAddress.city,
					shippingCountry: shippingAddress.country as ShippingCountry,
					shippingPhone: shippingAddress.phoneNumber || "",
					shippingMethod: "STANDARD",
					status: "PENDING",
					paymentStatus: "PENDING",
					fulfillmentStatus: "UNFULFILLED",
				},
			});

			// Create order items with denormalized product/SKU data
			for (const cartItem of cartItems) {
				const skuResult = skuDetailsResults.find(
					(r) => r.success && r.data?.sku.id === cartItem.skuId,
				);
				if (!skuResult?.success || !skuResult.data) continue;

				const sku = skuResult.data.sku;
				const product = sku.product;
				const primaryImage = sku.images.find((img) => img.isPrimary);
				const rawImageUrl = primaryImage?.url ?? sku.images[0]?.url ?? null;
				const imageUrl = getValidImageUrl(rawImageUrl) ?? null;

				await tx.orderItem.create({
					data: {
						orderId: newOrder.id,
						productId: product.id,
						skuId: sku.id,
						productTitle: product.title,
						productDescription: product.description ?? null,
						productImageUrl: imageUrl,
						skuColor: sku.color?.name ?? null,
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
		{ timeout: 30000, maxWait: 30000 },
	);
}
