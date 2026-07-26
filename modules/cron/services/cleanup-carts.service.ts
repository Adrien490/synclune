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
 * Invoqué comme passe secondaire de la route cron `cleanup-pending-orders`
 * (pas de cron dédié — right-sizing 2026-06). Les paniers guest expirés sont
 * déjà invisibles à la lecture (filtre `expiresAt` dans get-cart) ; cette passe
 * évite seulement leur accumulation indéfinie en DB.
 *
 * Hard-delete des paniers guest (userId null) passé leur expiresAt + grace period.
 * La grace period (23j post-expiresAt = ~30j depuis dernière interaction) laisse
 * une marge confortable au-delà du maxAge du cookie `cart_session` (7j glissants).
 *
 * Les paniers user (`userId != null`, `expiresAt: null` par design) ne sont
 * JAMAIS touchés.
 *
 * CartItems sont supprimés en cascade DB (Cart.items relation, onDelete: Cascade).
 */
const CART_GRACE_PERIOD_MS = 23 * 24 * 60 * 60 * 1000;

export async function cleanupExpiredCarts(): Promise<CronResult> {
	const now = new Date();
	const cutoff = new Date(now.getTime() - CART_GRACE_PERIOD_MS);
	let deletedCount = 0;
	let orphanedItemsCount = 0;
	let errored = 0;
	let hasMore = false;

	logger.info("Starting expired carts cleanup", { cronJob: CRON_JOB });

	// OPS-AUDIT-005 : per-step try/catch + errored++ instead of throwing — keeps
	// the orphan-cleanup step running even when the primary cart deletion fails,
	// and the admin alert via `withCronGuard` reports both partial counts.

	// 1. Trouver les paniers guest expirés depuis > grace period (bounded)
	// Garde RGPD art. 5.1.e : `expiresAt < cutoff` rate les rows `expiresAt IS NULL`
	// (sémantique SQL : NULL < x = UNKNOWN). Un panier guest sans expiry (legacy, edge
	// case) survivrait alors indéfiniment. On capture donc aussi les guests sans expiry
	// créés avant le cutoff. Cf. RGPD-AUDIT F4.
	try {
		const cartsToDelete = await prisma.cart.findMany({
			where: {
				userId: null,
				OR: [{ expiresAt: { lt: cutoff } }, { expiresAt: null, createdAt: { lt: cutoff } }],
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
		errored++;
	}

	// 2. Cleanup CartItems orphelins (safety net si cascade DB ne déclenche pas)
	try {
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
		errored++;
	}

	logger.info("Cleanup completed", { cronJob: CRON_JOB, errored });

	return {
		processed: deletedCount + orphanedItemsCount,
		errored,
		skipped: 0,
		deletedCount,
		orphanedItemsCount,
		hasMore,
	};
}
