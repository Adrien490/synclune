import { DisputeStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

/**
 * ORD-STRIPE-007 — bloque les actions admin qui pourraient causer une
 * double-dépense quand un dispute Stripe est encore ouvert sur la commande.
 *
 * Statuts terminaux (= dispute clôturé, action OK) :
 *   - WON / LOST / CHARGE_REFUNDED
 * Statuts non terminaux (= dispute ouvert, action bloquée) :
 *   - NEEDS_RESPONSE / UNDER_REVIEW
 *
 * Cas d'usage :
 *  - `createRefund` / `processRefund` admin → Stripe rejette de toute façon mais
 *    l'admin doit être averti AVANT pour ne pas s'engager envers le client.
 *  - `cancelOrder` admin → si chargeback en cours, le statut order doit pas
 *    bouger côté admin (le webhook charge.dispute.closed gère la transition).
 *  - Fulfillment (expédition) → expédier un produit déjà disputé = perte sèche.
 */
export async function hasOpenDispute(orderId: string): Promise<boolean> {
	const open = await prisma.dispute.findFirst({
		where: {
			orderId,
			status: {
				notIn: [DisputeStatus.WON, DisputeStatus.LOST, DisputeStatus.CHARGE_REFUNDED],
			},
		},
		select: { id: true },
	});
	return open !== null;
}
