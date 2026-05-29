import { cacheLife, cacheTag } from "next/cache";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { z } from "zod";
import { ORDERS_CACHE_TAGS } from "../constants/cache";

// Lightweight select for the confirmation page
const CONFIRMATION_ORDER_SELECT = {
	id: true,
	// EINV-SEC-001 : nécessaire pour l'ownership check côté wrapper non-caché.
	// Ne PAS exposer userId à un composant client (server-only).
	userId: true,
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

export type OrderForConfirmation = NonNullable<
	Awaited<ReturnType<typeof fetchOrderForConfirmation>>
>;

/**
 * Retrieves an order for the confirmation page.
 *
 * Security :
 * - Lookup by `id` (cuid, cryptographically random) AND `orderNumber` (double verification).
 * - Soft-deleted orders excluded (`notDeleted`).
 * - EINV-SEC-001 : si la commande est rattachée à un compte (`order.userId !== null`),
 *   la session en cours doit correspondre. Les guest checkouts (`order.userId === null`)
 *   restent accessibles à toute personne ayant le couple (orderId, orderNumber) — c'est
 *   le seul moyen pour un acheteur invité d'afficher sa page post-paiement.
 *
 * @param sessionUserId — `session?.user?.id` du caller. `undefined` si non connecté.
 */
export async function getOrderForConfirmation(
	orderId: string,
	orderNumber: string,
	sessionUserId?: string,
) {
	const validation = confirmationParamsSchema.safeParse({ orderId, orderNumber });
	if (!validation.success) return null;

	const order = await fetchOrderForConfirmation(
		validation.data.orderId,
		validation.data.orderNumber,
	);
	if (!order) return null;

	if (order.userId && order.userId !== sessionUserId) {
		return null;
	}

	return order;
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
