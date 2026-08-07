import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { z } from "zod";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
// Sélecteur allégé de la page de confirmation. Il vit dans `constants/` — c'est
// ce qui le rend visible à `order-select-snapshot-only.regression.test.ts`
// (garde read-side de l'invariant #4).
import { CONFIRMATION_ORDER_SELECT } from "../constants/order.constants";

const confirmationParamsSchema = z.object({
	orderId: z.cuid2(),
	orderNumber: z.string().min(1),
});

/**
 * Retrieves an order for the confirmation page.
 *
 * Security :
 * - Lookup by `id` (cuid, cryptographically random) AND `orderNumber` (double verification).
 * - Soft-deleted orders excluded (`notDeleted`).
 * - EINV-SEC-001 : la garde d'ownership de session est partie avec `Order.userId`
 *   (2026-08-05). Une commande n'a plus de propriétaire : l'accès repose sur la
 *   connaissance du couple (orderId, orderNumber), dont `orderId` est un cuid2
 *   cryptographiquement aléatoire. C'est le seul moyen pour un acheteur invité
 *   d'afficher sa page post-paiement, et c'était déjà le chemin de 100 % des
 *   commandes.
 */
export async function getOrderForConfirmation(orderId: string, orderNumber: string) {
	const validation = confirmationParamsSchema.safeParse({ orderId, orderNumber });
	if (!validation.success) return null;

	try {
		const order = await fetchOrderForConfirmation(
			validation.data.orderId,
			validation.data.orderNumber,
		);
		if (!order) return null;

		return order;
	} catch (error) {
		unstable_rethrow(error);
		// Le repli vit ICI, HORS du scope "use cache" de `fetchOrderForConfirmation`
		// (CACHE-DEGRADED-VALUE-001). Il y était jusqu'au 2026-08-07 : un hoquet DB
		// d'une seconde figeait « commande introuvable » pour toute la fenêtre du
		// profil `checkout` (5 min), et la page de confirmation redirige sur `/` — soit
		// l'acheteuse renvoyée à l'accueil juste après avoir payé, sans recours autre
		// que d'attendre. Même motif que `get-cart.ts`.
		logger.error("Failed to fetch order for confirmation", error, {
			service: "getOrderForConfirmation",
		});
		return null;
	}
}

/**
 * Cached inner fetch. Profile `checkout` (60s stale / 30s revalidate / 5min expire)
 * pour gerer les F5 post-paiement sans hammer DB tout en affichant le statut
 * webhook Stripe a jour rapidement. Invalide par getOrderInvalidationTags (webhooks).
 */
async function fetchOrderForConfirmation(orderId: string, orderNumber: string) {
	"use cache";
	cacheLife("checkout");
	cacheTag(ORDERS_CACHE_TAGS.CONFIRMATION(orderId));

	// ⚠️ AUCUN try/catch dans ce scope : le repli appartient au wrapper ci-dessus.
	return await prisma.order.findFirst({
		where: {
			id: orderId,
			orderNumber,
			...notDeleted,
		},
		select: CONFIRMATION_ORDER_SELECT,
	});
}
