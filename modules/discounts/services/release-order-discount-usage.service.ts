import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Releases the discount usage(s) attached to an order inside a transaction.
 *
 * Used by webhook handlers (`markOrderAsFailed`, `markOrderAsCancelled`) and the
 * `sync-async-payments` cron when a payment that originally booked a discount
 * fails or is canceled after `confirmCheckout` already incremented `usageCount`
 * and created `DiscountUsage` rows.
 *
 * Without this release, `Discount.usageCount` drifts upward on every failed
 * payment, eventually saturating `maxUsageCount` and blocking legit usages.
 *
 * Idempotent: callers can invoke this multiple times safely — the decrement is
 * guarded by `usageCount > 0` and the deleteMany no-ops on empty results.
 *
 * Returns the list of released `discountId`s so callers can invalidate
 * `DISCOUNT_CACHE_TAGS.USAGE(discountId)` after the transaction commits.
 */
export async function releaseOrderDiscountUsageTx(
	tx: Prisma.TransactionClient,
	orderId: string,
): Promise<string[]> {
	const usages = await tx.discountUsage.findMany({
		where: { orderId },
		select: { id: true, discountId: true },
	});

	if (usages.length === 0) {
		return [];
	}

	for (const usage of usages) {
		await tx.discount.updateMany({
			where: { id: usage.discountId, usageCount: { gt: 0 } },
			data: { usageCount: { decrement: 1 } },
		});
	}

	await tx.discountUsage.deleteMany({ where: { orderId } });

	return usages.map((u) => u.discountId);
}
