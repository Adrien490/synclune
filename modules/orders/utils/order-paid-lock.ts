import type { Prisma } from "@/app/generated/prisma/client";

/**
 * STOCK-02 — offset de l'advisory lock dédié à la transition PENDING→PAID d'une
 * commande. La clé est calculée en bigint (`offset + hashtext(orderId)`), ce qui la
 * place dans une plage (~4e9) DISJOINTE des clés de numérotation facture/avoir
 * (`1_000_000 + year` / `2_000_000 + year`, ~1-2e6, espace single-bigint) → aucune
 * collision possible entre les deux usages d'advisory lock.
 */
const ORDER_PAID_LOCK_OFFSET = 4_000_000_000;

/**
 * Acquiert un advisory lock transactionnel sérialisant la transition PAID d'une
 * commande entre ses deux writers concurrents possibles : le webhook
 * `payment_intent.succeeded` (`processOrderAtomically`) et l'action admin
 * `markAsPaid`. Sans ce verrou, les deux peuvent lire `paymentStatus=PENDING` via un
 * `findUnique` NON verrouillé, passer leur garde d'idempotence, et décrémenter le
 * stock CHACUN → double décrément d'inventaire (STOCK-02).
 *
 * `pg_advisory_xact_lock` (xact = relâché automatiquement au commit/rollback) : le 2ᵉ
 * arrivant bloque jusqu'au commit du 1ᵉr, puis son `findUnique` lit l'état `PAID`
 * committé → la garde `paymentStatus === "PAID"` court-circuite correctement. À
 * appeler en TOUT DÉBUT de transaction, AVANT le `findUnique` de la commande.
 */
export async function acquireOrderPaidLockTx(
	tx: Prisma.TransactionClient,
	orderId: string,
): Promise<void> {
	await tx.$queryRaw`SELECT pg_advisory_xact_lock(${ORDER_PAID_LOCK_OFFSET}::bigint + hashtext(${orderId}))`;
}
