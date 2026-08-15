import type { Prisma } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { GET_ORDER_TRACKING_SELECT } from "../constants/order.constants";
import { verifyOrderTrackingToken } from "../lib/order-tracking-token";

export type OrderForTracking = Prisma.OrderGetPayload<{
	select: typeof GET_ORDER_TRACKING_SELECT;
}>;

/**
 * Commande vue par la cliente via son lien tokenisé — SEUL accès client.
 *
 * Le token est vérifié CONTRE l'email en base (il signe `orderId:email`) :
 * pas d'accès par simple orderId, c'est la garde anti-énumération. Toute
 * signature invalide rend `null` — la page fait `notFound()`, sans distinguer
 * « commande inexistante » de « token faux ».
 *
 * Lecture volontairement SANS cache : donnée nominative, trafic minuscule
 * (un lien par commande), fraîcheur du statut prioritaire.
 */
export async function getOrderForTracking(
	orderId: string,
	token: string,
): Promise<OrderForTracking | null> {
	const secret = process.env.AUTH_SECRET;
	if (!secret) {
		logger.error("[getOrderForTracking] AUTH_SECRET manquant — suivi indisponible (fail-closed)");
		return null;
	}
	if (!orderId || !token) return null;

	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: GET_ORDER_TRACKING_SELECT,
	});
	if (!order || !order.email) return null;

	if (!verifyOrderTrackingToken(token, order.id, order.email, secret)) return null;

	return order;
}
