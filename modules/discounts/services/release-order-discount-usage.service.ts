import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Releases the discount attached to an order inside a transaction.
 *
 * Used by webhook handlers (`markOrderAsFailed`, `markOrderAsCancelled`) and the
 * `sync-async-payments` cron when a payment that originally booked a discount
 * fails or is canceled after `confirmCheckout` already incremented `usageCount`.
 *
 * Without this release, `Discount.usageCount` drifts upward on every failed
 * payment, eventually saturating `maxUsageCount` and blocking legit usages.
 *
 * Le code promo vit désormais en DEUX COLONNES sur `Order` (`discountId` +
 * snapshot `discountCode`) et non plus dans une table `DiscountUsage` : « libérer »
 * = remettre les colonnes à NULL. Une commande n'a jamais porté qu'un code (le
 * cookie panier en a un seul), donc le retour reste un tableau de 0 ou 1 élément
 * — la signature ne bouge pas, les 6 appelants non plus.
 *
 * Idempotent, et plus solidement qu'avant : la remise à NULL est un `updateMany`
 * gardé par `discountId: { not: null }`, donc c'est un CLAIM. Un second appel ne
 * matche plus aucune ligne et ne décrémente pas. L'implémentation précédente
 * (findMany → decrement → deleteMany) laissait deux transactions concurrentes
 * lire le même usage et décrémenter chacune leur tour : le garde `usageCount > 0`
 * empêchait de passer sous zéro, pas de décompter deux fois pour une commande.
 *
 * Returns the list of released `discountId`s so callers can invalidate
 * `DISCOUNT_CACHE_TAGS.USAGE(discountId)` after the transaction commits.
 */
export async function releaseOrderDiscountUsageTx(
	tx: Prisma.TransactionClient,
	orderId: string,
): Promise<string[]> {
	const order = await tx.order.findUnique({
		where: { id: orderId },
		select: { discountId: true },
	});

	if (!order?.discountId) {
		return [];
	}

	// Claim : seule la transaction qui remet effectivement la colonne à NULL a le
	// droit de décrémenter. `count === 0` ⇒ un appel concurrent est passé avant.
	const claimed = await tx.order.updateMany({
		where: { id: orderId, discountId: { not: null } },
		data: { discountId: null, discountCode: null },
	});

	if (claimed.count === 0) {
		return [];
	}

	await tx.discount.updateMany({
		where: { id: order.discountId, usageCount: { gt: 0 } },
		data: { usageCount: { decrement: 1 } },
	});

	return [order.discountId];
}
