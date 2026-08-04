import type { Prisma } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { verifyOrderTrackingToken } from "../utils/tracking-token";

/**
 * AUDIT-BIZ-001 — lecture de commande pour la page de suivi **invité**
 * (`/suivi-commande?commande=…&token=…`).
 *
 * Périmètre PII volontairement plus étroit que `GET_ORDER_SELECT_CUSTOMER` : la
 * page est authentifiée par un lien, pas par une session. On expose donc
 * uniquement ce que le client a lui-même saisi ou reçu (articles, montants,
 * adresse de livraison, statuts, suivi transporteur) et RIEN de l'identité
 * légale de facturation (`billing*`, `invoiceDataSnapshot`, `vendor*`) ni des
 * identifiants PSP (`stripe*`) ou des notes internes de remboursement.
 *
 * ⚠️ Pas de `"use cache"` : l'entrée est un token opaque, et le résultat est
 * scopé à une seule commande. Un cache privé n'apporterait rien (une visite par
 * lien) et un cache partagé serait un risque de fuite cross-commande.
 */
const GET_ORDER_TRACKING_SELECT = {
	id: true,
	orderNumber: true,
	createdAt: true,
	status: true,
	paymentStatus: true,
	paidAt: true,
	shippedAt: true,
	actualDelivery: true,
	estimatedDelivery: true,
	subtotal: true,
	discountAmount: true,
	// `discountCode` manquait ici alors qu'`OrderSummaryCard` le rend — « Réduction
	// (CODE10) ». La prop étant optionnelle, `tsc` ne bronchait pas et la
	// parenthèse restait vide sur toutes les commandes (audit V2, Lot 5).
	discountCode: true,
	shippingCost: true,
	total: true,
	paymentMethod: true,
	shippingCarrier: true,
	trackingNumber: true,
	trackingUrl: true,
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
			productDescription: true,
			productImageUrl: true,
			skuColor: true,
			skuMaterial: true,
			skuSize: true,
			price: true,
			quantity: true,
		},
	},
	// Statut seul (pas de montant, pas de `note` libre) : suffit à
	// `getReturnIneligibilityReason` pour détecter `ALREADY_REQUESTED`.
	refunds: {
		select: { status: true },
	},
} as const satisfies Prisma.OrderSelect;

export type GetOrderForTrackingReturn = Prisma.OrderGetPayload<{
	select: typeof GET_ORDER_TRACKING_SELECT;
}>;

/**
 * Résout une commande depuis un couple `(orderNumber, token)`.
 *
 * Fail-closed : retourne `null` si la commande n'existe pas, est soft-deleted,
 * ou si le token ne correspond pas — la page appelante rend un 404 indistinct
 * dans les trois cas (pas d'oracle d'existence de commande).
 *
 * Le token est vérifié en temps constant contre `(order.id, order.orderNumber)`
 * — donc APRÈS le lookup, comme la route facture : `orderNumber` porte 48 bits
 * d'entropie CSPRNG (`generateOrderNumber`), il n'est pas énumérable.
 */
export async function getOrderForTracking(
	orderNumber: string,
	token: string,
): Promise<GetOrderForTrackingReturn | null> {
	try {
		const order = await prisma.order.findFirst({
			where: { orderNumber, ...notDeleted },
			select: GET_ORDER_TRACKING_SELECT,
		});

		if (!order) return null;

		if (!verifyOrderTrackingToken(order.id, order.orderNumber, token)) {
			logger.warn("[order-tracking] Invalid tracking token", {
				service: "order-tracking",
				orderNumber,
			});
			return null;
		}

		return order;
	} catch (error) {
		logger.error("Failed to fetch order for tracking", error, {
			service: "order-tracking",
		});
		return null;
	}
}
