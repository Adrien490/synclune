import type { Prisma } from "@/app/generated/prisma/client";
import { OrderAction } from "@/app/generated/prisma/client";

/**
 * Préfixes de note d'audit des litiges — SSOT partagée entre l'écriture (les handlers
 * webhook `charge.dispute.*`) et la lecture (`hasOpenDisputeTx` ci-dessous).
 *
 * Ils portent le `stripeDisputeId`, ce qui rend chaque entrée d'audit adressable :
 * c'est ce qui permet à la fois l'anti-rejeu par litige et le comptage ouvert/résolu.
 * Écrire ces chaînes en littéral ailleurs découplerait silencieusement les deux côtés
 * (l'anti-rejeu ne matcherait plus rien ⇒ doublons d'avoirs).
 */
export const DISPUTE_OPENED_NOTE_PREFIX = (stripeDisputeId: string) =>
	`[LITIGE OUVERT] Litige Stripe ${stripeDisputeId}`;

export const DISPUTE_CLOSED_NOTE_PREFIX = (stripeDisputeId: string) =>
	`[LITIGE CLOTURE] Litige ${stripeDisputeId}`;

/**
 * ORD-STRIPE-007 — la commande a-t-elle un litige Stripe encore ouvert ?
 *
 * Garde de double dépense : rembourser ou annuler une commande dont le chargeback
 * court, c'est payer deux fois (le refund admin PUIS la reprise de fonds Stripe si
 * le litige est perdu). Trois appelants : `create-refund`, `process-refund`,
 * `cancel-order`.
 *
 * Dérivé de l'audit trail depuis le retrait du modèle `Dispute` (simplification V1,
 * 2026-07-30) : un litige est ouvert tant que son `DISPUTE_OPENED` n'a pas reçu le
 * `DISPUTE_RESOLVED` correspondant. Les deux entrées sont écrites exactement une fois
 * par litige (anti-rejeu sous verrou de ligne dans les handlers), donc comparer les
 * deux comptes est exact — et strictement équivalent à l'ancien
 * `status notIn [WON, LOST, CHARGE_REFUNDED]` puisque `DISPUTE_RESOLVED` est écrit
 * pour TOUTES les clôtures, débitantes ou non.
 *
 * ⚠️ À lire DANS la transaction de la mutation, après le verrou de ligne sur `Order` :
 * hors verrou, un `charge.dispute.created` concurrent passerait entre la lecture et
 * l'écriture. `OrderHistory` étant immuable et append-only, aucun risque d'ABA.
 */
export async function hasOpenDisputeTx(
	tx: Prisma.TransactionClient,
	orderId: string,
): Promise<boolean> {
	const [opened, resolved] = await Promise.all([
		tx.orderHistory.count({ where: { orderId, action: OrderAction.DISPUTE_OPENED } }),
		tx.orderHistory.count({ where: { orderId, action: OrderAction.DISPUTE_RESOLVED } }),
	]);

	return opened > resolved;
}
