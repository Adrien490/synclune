import type Stripe from "stripe";
import {
	type Prisma,
	DiscountType,
	PaymentStatus,
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";

import { BusinessError } from "@/shared/lib/actions";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import { logger } from "@/shared/lib/logger";
import { getValidImageUrl } from "@/shared/lib/media-validation";
import { prisma } from "@/shared/lib/prisma";

import { checkDiscountEligibility } from "@/modules/discounts/services/discount-eligibility.service";
import {
	calculateDiscountWithExclusion,
	type CartItemForDiscount,
} from "@/modules/discounts/services/discount-calculation.service";
import { DISCOUNT_ERROR_MESSAGES } from "@/modules/discounts/constants/discount.constants";
import {
	getShippingMethodFromRate,
	getShippingCarrierFromRate,
} from "@/modules/orders/constants/stripe-shipping-rates";
import { generateOrderNumber } from "@/modules/orders/services/order-generation.service";
import type { ShippingCountry } from "@/shared/constants/countries";

import type { OrderWithItems } from "../types/checkout.types";

function isDiscountType(value: string): value is DiscountType {
	return value === DiscountType.PERCENTAGE || value === DiscountType.FIXED_AMOUNT;
}

interface SessionShippingInfo {
	cost: number;
	rateId: string | undefined;
	method: string;
	carrier: string;
}

/**
 * Extrait le tarif et la méthode de livraison depuis la Session Stripe (déjà
 * `expand`ée en amont). Calculé via `total_details.amount_shipping` qui inclut
 * d'éventuelles ristournes appliquées.
 */
function getSessionShippingInfo(session: Stripe.Checkout.Session): SessionShippingInfo {
	const cost = session.total_details?.amount_shipping ?? session.shipping_cost?.amount_total ?? 0;
	const rateRaw = session.shipping_cost?.shipping_rate;
	const rateId = typeof rateRaw === "string" ? rateRaw : (rateRaw?.id ?? undefined);
	return {
		cost,
		rateId,
		method: getShippingMethodFromRate(rateId ?? ""),
		carrier: getShippingCarrierFromRate(rateId ?? ""),
	};
}

interface SessionShippingDetails {
	firstName: string;
	lastName: string;
	address1: string;
	address2: string | null;
	postalCode: string;
	city: string;
	country: ShippingCountry;
	phone: string;
}

function parseFullName(fullName: string | null | undefined): {
	firstName: string;
	lastName: string;
} {
	const parts = (fullName ?? "").trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return { firstName: "", lastName: "" };
	const [first, ...rest] = parts;
	return { firstName: first, lastName: rest.join(" ") };
}

function extractShippingDetails(session: Stripe.Checkout.Session): SessionShippingDetails {
	const shipping = session.collected_information?.shipping_details ?? null;
	const address = shipping?.address ?? session.customer_details?.address;
	const { firstName, lastName } = parseFullName(shipping?.name ?? session.customer_details?.name);

	return {
		firstName,
		lastName,
		address1: address?.line1 ?? "",
		address2: address?.line2 ?? null,
		postalCode: address?.postal_code ?? "",
		city: address?.city ?? "",
		country: (address?.country ?? "FR") as ShippingCountry,
		phone: session.customer_details?.phone ?? "",
	};
}

/**
 * Crée l'`Order` Synclune à partir d'une Checkout Session Stripe complétée.
 *
 * Toutes les étapes (vérification stock FOR UPDATE, décrément, application du
 * discount, création de l'ordre + items, nettoyage du panier) se déroulent dans
 * une transaction Prisma unique. Idempotent grâce à `Order.stripeCheckoutSessionId
 * @unique` : un 2e webhook avec la même session retournera l'ordre existant.
 */
export async function createOrderFromCheckoutSession(
	session: Stripe.Checkout.Session,
): Promise<OrderWithItems> {
	const sessionId = session.id;
	const cartId = session.metadata?.cartId ?? session.client_reference_id;
	if (!cartId) {
		throw new Error(`Missing cartId in metadata for session ${sessionId}`);
	}

	// Fast path : si l'ordre existe déjà (webhook rejoué), on le rapatrie.
	const existing = await prisma.order.findUnique({
		where: { stripeCheckoutSessionId: sessionId },
		include: {
			items: {
				include: {
					sku: { select: { id: true, inventory: true, sku: true } },
				},
			},
		},
	});
	if (existing) {
		logger.info(`⏭️  [WEBHOOK] Order already created for session ${sessionId}, skipping`, {
			service: "webhook",
		});
		return mapOrderToOrderWithItems(existing);
	}

	const shippingInfo = getSessionShippingInfo(session);
	const shippingDetails = extractShippingDetails(session);
	const customerEmail = session.customer_details?.email ?? session.customer_email ?? "";
	const customerName = session.customer_details?.name ?? "";
	const stripeCustomerId =
		typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
	const paymentIntentId =
		typeof session.payment_intent === "string"
			? session.payment_intent
			: (session.payment_intent?.id ?? null);
	const totalDiscountFromSession = session.total_details?.amount_discount ?? 0;
	const discountCodeMeta = session.metadata?.discountCode ?? null;

	return prisma.$transaction(
		async (tx) => {
			// Double-check idempotency à l'intérieur de la transaction pour parer aux
			// webhooks rejoués en parallèle.
			const existingInsideTx = await tx.order.findUnique({
				where: { stripeCheckoutSessionId: sessionId },
				include: {
					items: {
						include: {
							sku: { select: { id: true, inventory: true, sku: true } },
						},
					},
				},
			});
			if (existingInsideTx) {
				return mapOrderToOrderWithItems(existingInsideTx);
			}

			// 1. Charge le panier (avec les SKUs nécessaires à la création de l'ordre)
			const cart = await tx.cart.findUnique({
				where: { id: cartId },
				select: {
					id: true,
					userId: true,
					sessionId: true,
					appliedDiscountCode: true,
					discountAmountCache: true,
					items: {
						where: {
							sku: { deletedAt: null, product: { deletedAt: null } },
						},
						select: {
							skuId: true,
							quantity: true,
							priceAtAdd: true,
							sku: {
								select: {
									id: true,
									sku: true,
									priceInclTax: true,
									compareAtPrice: true,
									color: { select: { id: true, name: true, hex: true } },
									materials: {
										orderBy: { position: "asc" as const },
										select: { material: { select: { id: true, name: true } } },
									},
									size: true,
									product: {
										select: {
											id: true,
											title: true,
											description: true,
										},
									},
									images: {
										where: { isPrimary: true },
										take: 1,
										orderBy: { createdAt: "asc" as const },
										select: { url: true, altText: true, isPrimary: true },
									},
								},
							},
						},
					},
				},
			});

			if (!cart || cart.items.length === 0) {
				throw new Error(`Cart not found or empty for session ${sessionId} (cartId=${cartId})`);
			}

			const userId = cart.userId;

			// 2. Vérifier le stock avec FOR UPDATE pour éviter les double-vente.
			const skuIds = cart.items.map((item) => item.skuId);
			const lockedSkus = await tx.$queryRaw<
				Array<{
					id: string;
					isActive: boolean;
					inventory: number;
					productStatus: string;
					productDeletedAt: Date | null;
					deletedAt: Date | null;
				}>
			>`
				SELECT
					ps.id,
					ps."isActive",
					ps.inventory,
					ps."deletedAt",
					p.status AS "productStatus",
					p."deletedAt" AS "productDeletedAt"
				FROM "ProductSku" ps
				INNER JOIN "Product" p ON ps."productId" = p.id
				WHERE ps.id = ANY(${skuIds}::text[])
				FOR UPDATE
			`;
			const skuMap = new Map(lockedSkus.map((s) => [s.id, s]));

			for (const item of cart.items) {
				const sku = skuMap.get(item.skuId);
				const valid =
					sku &&
					!sku.deletedAt &&
					!sku.productDeletedAt &&
					sku.isActive &&
					sku.productStatus === "PUBLIC" &&
					sku.inventory >= item.quantity;
				if (!valid) {
					throw new BusinessError(
						`Stock insuffisant pour le SKU ${item.skuId} (commande session ${sessionId})`,
					);
				}
			}

			// 3. Calcule le subtotal (prix snapshot du panier).
			const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

			// 4. Applique le discount FOR UPDATE si présent
			let discountAmount = 0;
			let appliedDiscountId: string | null = null;
			let appliedDiscountCode: string | null = null;
			const discountCode = discountCodeMeta ?? cart.appliedDiscountCode;
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
					logger.warn(
						`[WEBHOOK] Discount code ${discountCode} no longer exists for session ${sessionId} — order will be created without discount`,
						{ service: "webhook" },
					);
				} else {
					const discount = discountRows[0]!;
					if (!isDiscountType(discount.type)) {
						throw new BusinessError(`Type de réduction inconnu : ${discount.type}`);
					}
					const discountType = discount.type;

					let usageCounts: { userCount: number; emailCount: number } | undefined;
					if (discount.maxUsagePerUser) {
						let userCount = 0;
						let emailCount = 0;
						if (userId) {
							userCount = await tx.discountUsage.count({
								where: { discountId: discount.id, userId },
							});
						}
						if (customerEmail) {
							emailCount = await tx.discountUsage.count({
								where: { discountId: discount.id, order: { customerEmail } },
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
						{ subtotal, userId: userId ?? undefined, customerEmail: customerEmail || undefined },
						usageCounts,
					);

					if (!eligibility.eligible) {
						logger.warn(
							`[WEBHOOK] Discount ${discountCode} no longer eligible for session ${sessionId}: ${eligibility.error}`,
							{ service: "webhook" },
						);
					} else {
						const cartItemsForDiscount: CartItemForDiscount[] = cart.items.map((item) => ({
							priceInclTax: item.sku.priceInclTax,
							quantity: item.quantity,
							compareAtPrice: item.sku.compareAtPrice,
						}));
						const computed = calculateDiscountWithExclusion({
							type: discountType,
							value: discount.value,
							cartItems: cartItemsForDiscount,
							excludeSaleItems: true,
						});
						discountAmount = Math.max(0, Math.min(computed, subtotal));

						if (discountAmount > 0) {
							const updateResult = await tx.$executeRaw`
								UPDATE "Discount"
								SET "usageCount" = "usageCount" + 1
								WHERE id = ${discount.id}
									AND ("maxUsageCount" IS NULL OR "usageCount" < "maxUsageCount")
							`;
							if (updateResult === 0) {
								throw new BusinessError(DISCOUNT_ERROR_MESSAGES.MAX_USAGE_REACHED);
							}
							appliedDiscountId = discount.id;
							appliedDiscountCode = discount.code;
						}
					}
				}
			}

			// 5. Calcule le total final (TVA non applicable, art. 293 B CGI).
			const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
			const total = Math.max(0, subtotalAfterDiscount + shippingInfo.cost);

			// 6. Defense-in-depth : refuser de créer la commande si Stripe a encaissé
			// moins que le total attendu.
			if (typeof session.amount_total === "number" && session.amount_total < total) {
				throw new Error(
					`Amount mismatch for session ${sessionId}: Stripe captured ${session.amount_total} but Synclune total is ${total}`,
				);
			}

			// Réconciliation : si Stripe a encaissé un peu plus (frais ajustés), on prend
			// le total Stripe pour rester aligné comptablement.
			const finalTotal = session.amount_total ?? total;
			// Si Stripe a déjà appliqué un discount via promotion_code interne, on le
			// reflète au lieu du nôtre.
			const finalDiscountAmount =
				totalDiscountFromSession > 0 && discountAmount === 0
					? totalDiscountFromSession
					: discountAmount;

			// 7. Crée l'Order
			const orderNumber = generateOrderNumber();
			const createdOrder = await tx.order.create({
				data: {
					orderNumber,
					userId,
					stripeCheckoutSessionId: sessionId,
					stripePaymentIntentId: paymentIntentId,
					stripeCustomerId,
					subtotal,
					discountAmount: finalDiscountAmount,
					shippingCost: shippingInfo.cost,
					taxAmount: 0,
					total: finalTotal,
					currency: DEFAULT_CURRENCY,
					customerEmail,
					customerName:
						customerName ||
						`${shippingDetails.firstName} ${shippingDetails.lastName}`.trim() ||
						"Client",
					shippingFirstName: shippingDetails.firstName,
					shippingLastName: shippingDetails.lastName,
					shippingAddress1: shippingDetails.address1,
					shippingAddress2: shippingDetails.address2,
					shippingPostalCode: shippingDetails.postalCode,
					shippingCity: shippingDetails.city,
					shippingCountry: shippingDetails.country,
					shippingPhone: shippingDetails.phone,
					shippingMethod: shippingInfo.method,
					shippingCarrier: shippingInfo.carrier,
					shippingRateId: shippingInfo.rateId ?? null,
					status: OrderStatus.PROCESSING,
					paymentStatus: PaymentStatus.PAID,
					fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
					paidAt: new Date(),
				},
			});

			// 8. Crée les OrderItems (snapshot dénormalisé)
			for (const item of cart.items) {
				const sku = item.sku;
				const product = sku.product;
				const primaryImage = sku.images.find((img) => img.isPrimary);
				const rawImageUrl = primaryImage?.url ?? sku.images[0]?.url ?? null;
				const imageUrl = getValidImageUrl(rawImageUrl) ?? null;
				const materialLabel =
					sku.materials
						.map((m) => m.material.name)
						.filter(Boolean)
						.join(" / ") || null;

				await tx.orderItem.create({
					data: {
						orderId: createdOrder.id,
						productId: product.id,
						skuId: sku.id,
						productTitle: product.title,
						productDescription: product.description ?? null,
						productImageUrl: imageUrl,
						skuColor: sku.color?.name ?? null,
						skuMaterial: materialLabel,
						skuSize: sku.size ?? null,
						skuImageUrl: imageUrl,
						price: item.priceAtAdd,
						quantity: item.quantity,
					},
				});
			}

			// 9. Décrémente le stock
			for (const item of cart.items) {
				await tx.productSku.update({
					where: { id: item.skuId },
					data: { inventory: { decrement: item.quantity } },
				});
			}

			// 10. Désactive les SKUs maintenant en rupture (single update)
			const { count: deactivatedCount } = await tx.productSku.updateMany({
				where: { id: { in: skuIds }, inventory: 0 },
				data: { isActive: false },
			});
			if (deactivatedCount > 0) {
				logger.info(
					`📦 [WEBHOOK] ${deactivatedCount} SKU(s) deactivated for order ${createdOrder.id}`,
					{ service: "webhook" },
				);
			}

			// 11. Record DiscountUsage si applicable
			if (appliedDiscountId && appliedDiscountCode && discountAmount > 0) {
				await tx.discountUsage.create({
					data: {
						discountId: appliedDiscountId,
						orderId: createdOrder.id,
						userId: userId ?? null,
						discountCode: appliedDiscountCode,
						amountApplied: discountAmount,
					},
				});
			}

			// 12. Vide le panier (les items, pas la coquille — gardée pour l'historique)
			await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
			await tx.cart.update({
				where: { id: cart.id },
				data: { appliedDiscountCode: null, discountAmountCache: null },
			});

			logger.info(
				`✅ [WEBHOOK] Order ${createdOrder.orderNumber} created from session ${sessionId}`,
				{ service: "webhook" },
			);

			// 13. Reload avec items pour le mapping
			const orderWithItems = await tx.order.findUniqueOrThrow({
				where: { id: createdOrder.id },
				include: {
					items: {
						include: {
							sku: { select: { id: true, inventory: true, sku: true } },
						},
					},
				},
			});

			return mapOrderToOrderWithItems(orderWithItems);
		},
		{ timeout: 30000, maxWait: 10000 },
	);
}

type OrderWithItemsRow = {
	id: string;
	orderNumber: string;
	userId: string | null;
	customerEmail: string | null;
	shippingFirstName: string | null;
	shippingLastName: string | null;
	shippingAddress1: string | null;
	shippingAddress2: string | null;
	shippingPostalCode: string | null;
	shippingCity: string | null;
	shippingCountry: string | null;
	shippingPhone: string | null;
	subtotal: number;
	discountAmount: number;
	shippingCost: number;
	taxAmount: number;
	total: number;
	items: Array<{
		productTitle: string | null;
		skuColor: string | null;
		skuMaterial: string | null;
		skuSize: string | null;
		quantity: number;
		price: number;
		skuId: string;
		sku: { id: string; inventory: number; sku: string } | null;
	}>;
};

function mapOrderToOrderWithItems(order: OrderWithItemsRow): OrderWithItems {
	return {
		id: order.id,
		orderNumber: order.orderNumber,
		userId: order.userId,
		customerEmail: order.customerEmail,
		shippingFirstName: order.shippingFirstName,
		shippingLastName: order.shippingLastName,
		shippingAddress1: order.shippingAddress1,
		shippingAddress2: order.shippingAddress2,
		shippingPostalCode: order.shippingPostalCode,
		shippingCity: order.shippingCity,
		shippingCountry: order.shippingCountry,
		shippingPhone: order.shippingPhone,
		subtotal: order.subtotal,
		discountAmount: order.discountAmount,
		shippingCost: order.shippingCost,
		taxAmount: order.taxAmount,
		total: order.total,
		items: order.items.map((item) => ({
			productTitle: item.productTitle,
			skuColor: item.skuColor,
			skuMaterial: item.skuMaterial,
			skuSize: item.skuSize,
			quantity: item.quantity,
			price: item.price,
			skuId: item.skuId,
			sku: item.sku,
		})),
	};
}

// Unused but kept to satisfy any external imports during migration.
export type _Prisma = Prisma.TransactionClient;
