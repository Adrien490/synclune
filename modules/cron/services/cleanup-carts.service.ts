import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const CRON_JOB = "cleanup-carts";

function captureStepError(error: unknown, step: string, context: Record<string, unknown>): void {
	Sentry.withScope((scope) => {
		scope.setTag("cronJob", CRON_JOB);
		scope.setTag("step", step);
		scope.setLevel("error");
		scope.setFingerprint(["cron", CRON_JOB, step]);
		scope.setContext("cleanup", context);
		Sentry.captureException(error);
	});
}

/**
 * Cleans up expired guest carts.
 *
 * Hard-delete des paniers guest (userId null) passé leur expiresAt + grace period.
 * La grace period (23j post-expiresAt = ~30j depuis création) couvre les emails de
 * relance abandoned-cart et préserve le droit RGPD à la portabilité court terme.
 *
 * Au-delà : conservation contrevient à RGPD art. 5.1.e (limitation conservation).
 *
 * CartItems sont supprimés en cascade DB (Cart.items relation, onDelete: Cascade).
 */
const CART_GRACE_PERIOD_MS = 23 * 24 * 60 * 60 * 1000;

export async function cleanupExpiredCarts(): Promise<CronResult> {
	const now = new Date();
	const cutoff = new Date(now.getTime() - CART_GRACE_PERIOD_MS);
	let deletedCount = 0;
	let orphanedItemsCount = 0;
	let hasMore = false;

	logger.info("Starting expired carts cleanup", { cronJob: CRON_JOB });

	try {
		// 1. Trouver les paniers guest expirés depuis > grace period (bounded)
		const cartsToDelete = await prisma.cart.findMany({
			where: {
				expiresAt: { lt: cutoff },
				userId: null,
			},
			select: { id: true },
			take: CLEANUP_DELETE_LIMIT,
		});

		const deleteResult = await prisma.cart.deleteMany({
			where: { id: { in: cartsToDelete.map((c) => c.id) } },
		});

		deletedCount = deleteResult.count;
		hasMore = cartsToDelete.length === CLEANUP_DELETE_LIMIT;

		logger.info("Deleted expired guest carts", { cronJob: CRON_JOB, deletedCount });

		if (hasMore) {
			logger.warn("Delete limit reached, remaining carts will be cleaned on next run", {
				cronJob: CRON_JOB,
			});
		}
	} catch (error) {
		logger.error("Error during cart deletion", error, { cronJob: CRON_JOB });
		captureStepError(error, "cart-deletion", { cutoff: cutoff.toISOString(), deletedCount });
		throw error;
	}

	try {
		// 2. Cleanup CartItems orphelins (safety net si cascade DB ne déclenche pas)
		const rawCount = await prisma.$executeRaw`
			DELETE FROM "CartItem"
			WHERE id IN (
				SELECT ci.id FROM "CartItem" ci
				WHERE NOT EXISTS (
					SELECT 1 FROM "Cart" c WHERE c.id = ci."cartId"
				)
				LIMIT ${CLEANUP_DELETE_LIMIT}
			)
		`;

		orphanedItemsCount = Number(rawCount);

		if (orphanedItemsCount > 0) {
			logger.info("Cleaned up orphaned cart items", {
				cronJob: CRON_JOB,
				orphanedItemsCount,
			});
		}
	} catch (error) {
		logger.error("Error during orphan items cleanup", error, { cronJob: CRON_JOB });
		captureStepError(error, "orphan-items", { deletedCount, orphanedItemsCount });
		throw error;
	}

	logger.info("Cleanup completed", { cronJob: CRON_JOB });

	return {
		processed: deletedCount + orphanedItemsCount,
		errored: 0,
		skipped: 0,
		deletedCount,
		orphanedItemsCount,
		hasMore,
	};
}
