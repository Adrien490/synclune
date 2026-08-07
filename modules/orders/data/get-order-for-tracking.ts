import type { Prisma } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { GET_ORDER_TRACKING_SELECT } from "../constants/order.constants";
import { verifyOrderTrackingToken } from "../utils/tracking-token";

/**
 * AUDIT-BIZ-001 — lecture de commande pour la page de suivi **invité**
 * (`/suivi-commande?commande=…&token=…`).
 *
 * Le sélecteur vit dans `constants/order.constants.ts` — c'est ce qui le rend
 * visible à `order-select-snapshot-only.regression.test.ts` (garde read-side de
 * l'invariant #4 : aucun join live `product`/`sku` sur une commande passée).
 *
 * ⚠️ Pas de `"use cache"` : l'entrée est un token opaque, et le résultat est
 * scopé à une seule commande. Un cache privé n'apporterait rien (une visite par
 * lien) et un cache partagé serait un risque de fuite cross-commande.
 */
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
