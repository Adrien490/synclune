import { cacheLife, cacheTag } from "next/cache";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { z } from "zod";
import { ORDERS_CACHE_TAGS } from "../constants/cache";

// Lightweight select for the confirmation page
const CONFIRMATION_ORDER_SELECT = {
	id: true,
	orderNumber: true,
	createdAt: true,
	customerEmail: true,
	subtotal: true,
	shippingCost: true,
	discountAmount: true,
	total: true,
	paymentStatus: true,
	stripePaymentIntentId: true,
	shippingFirstName: true,
	shippingLastName: true,
	shippingAddress1: true,
	shippingAddress2: true,
	shippingPostalCode: true,
	shippingCity: true,
	shippingCountry: true,
	items: {
		select: {
			id: true,
			productTitle: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			skuImageUrl: true,
			price: true,
			quantity: true,
		},
	},
} as const;

const confirmationParamsSchema = z.object({
	orderId: z.cuid2(),
	orderNumber: z.string().min(1),
});

const sessionIdSchema = z.string().min(1).max(255);

export type OrderForConfirmation = NonNullable<
	Awaited<ReturnType<typeof fetchOrderForConfirmation>>
>;

/**
 * Retrieves an order for the confirmation page without requiring authentication.
 *
 * Security: The order is looked up by both `id` (cuid, cryptographically random)
 * AND `orderNumber`, providing a double verification that prevents enumeration.
 * Only non-deleted orders are returned.
 */
export async function getOrderForConfirmation(orderId: string, orderNumber: string) {
	const validation = confirmationParamsSchema.safeParse({ orderId, orderNumber });
	if (!validation.success) return null;
	return fetchOrderForConfirmation(validation.data.orderId, validation.data.orderNumber);
}

/**
 * Cached inner fetch. Profile `realtime` (30s stale / 15s revalidate / 1min expire)
 * pour gerer les F5 post-paiement sans hammer DB tout en affichant le statut
 * webhook Stripe a jour rapidement. Invalide par getOrderInvalidationTags (webhooks).
 */
async function fetchOrderForConfirmation(orderId: string, orderNumber: string) {
	"use cache";
	cacheLife("checkout");
	cacheTag(ORDERS_CACHE_TAGS.CONFIRMATION(orderId));

	try {
		return await prisma.order.findFirst({
			where: {
				id: orderId,
				orderNumber,
				...notDeleted,
			},
			select: CONFIRMATION_ORDER_SELECT,
		});
	} catch (error) {
		logger.error("Failed to fetch order for confirmation", error, {
			service: "getOrderForConfirmation",
		});
		return null;
	}
}

/**
 * Fallback lookup pour la page de confirmation quand le user atterrit avec
 * `session_id+pending=true` (paiement async SEPA ou webhook en retard
 * > findOrderWithRetry 1.5s dans /paiement/retour).
 *
 * NON CACHÉ on purpose : la donnée bascule null → Order rapidement à l'arrivée
 * du webhook ; un F5 doit refléter immédiatement l'Order fraîchement créée.
 */
export async function getOrderBySessionId(sessionId: string) {
	const validation = sessionIdSchema.safeParse(sessionId);
	if (!validation.success) return null;

	try {
		return await prisma.order.findFirst({
			where: {
				stripeCheckoutSessionId: validation.data,
				...notDeleted,
			},
			select: CONFIRMATION_ORDER_SELECT,
		});
	} catch (error) {
		logger.error("Failed to fetch order by session id", error, {
			service: "getOrderBySessionId",
		});
		return null;
	}
}
