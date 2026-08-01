import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";
import { WISHLIST_EXPIRATION_DAYS } from "@/modules/wishlist/constants/expiration.constants";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const CRON_JOB = "cleanup-wishlists";

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
 * Cleans up inactive guest wishlists.
 *
 * Invoqué comme passe tertiaire de la route cron `cleanup-pending-orders`
 * (pas de cron dédié — right-sizing 2026-06, chaque cron réveille Neon).
 *
 * Garde RGPD art. 5.1.e : la page de confidentialité annonce une rétention de
 * 30 jours pour la wishlist visiteur — jusqu'à l'audit wishlist 2026-08-01,
 * AUCUN mécanisme ne l'exécutait (pas d'`expiresAt`, aucun cron) : chaque
 * ligne `Wishlist` invitée était immortelle alors que son cookie, lui,
 * expirait. Le seuil s'appuie sur `updatedAt` (rafraîchi par toutes les
 * mutations wishlist = dernière interaction), pas sur une colonne `expiresAt`
 * dédiée : zéro changement des chemins d'écriture.
 *
 * Hard-delete des wishlists guest (userId null) inactives depuis plus de
 * 30 jours (maxAge du cookie `wishlist_session`, glissant) + 7 jours de grâce.
 * Les wishlists user (`userId != null` — l'administratrice) ne sont JAMAIS
 * touchées.
 *
 * WishlistItems supprimés en cascade DB (Wishlist.items, onDelete: Cascade).
 */
const WISHLIST_GRACE_PERIOD_DAYS = 7;
const WISHLIST_RETENTION_MS =
	(WISHLIST_EXPIRATION_DAYS + WISHLIST_GRACE_PERIOD_DAYS) * 24 * 60 * 60 * 1000;

export async function cleanupInactiveWishlists(): Promise<CronResult> {
	const now = new Date();
	const cutoff = new Date(now.getTime() - WISHLIST_RETENTION_MS);
	let deletedCount = 0;
	let orphanedItemsCount = 0;
	let errored = 0;
	let hasMore = false;

	logger.info("Starting inactive wishlists cleanup", { cronJob: CRON_JOB });

	// 1. Trouver les wishlists guest inactives depuis > rétention (bounded).
	// `updatedAt` est non-nullable (@updatedAt) — pas de branche NULL à couvrir,
	// contrairement au `expiresAt` des paniers (cf. RGPD-AUDIT F4).
	try {
		const wishlistsToDelete = await prisma.wishlist.findMany({
			where: {
				userId: null,
				updatedAt: { lt: cutoff },
			},
			select: { id: true },
			take: CLEANUP_DELETE_LIMIT,
		});

		const deleteResult = await prisma.wishlist.deleteMany({
			where: { id: { in: wishlistsToDelete.map((w) => w.id) } },
		});

		deletedCount = deleteResult.count;
		hasMore = wishlistsToDelete.length === CLEANUP_DELETE_LIMIT;

		logger.info("Deleted inactive guest wishlists", { cronJob: CRON_JOB, deletedCount });

		if (hasMore) {
			logger.warn("Delete limit reached, remaining wishlists will be cleaned on next run", {
				cronJob: CRON_JOB,
			});
		}
	} catch (error) {
		logger.error("Error during wishlist deletion", error, { cronJob: CRON_JOB });
		captureStepError(error, "wishlist-deletion", { cutoff: cutoff.toISOString(), deletedCount });
		errored++;
	}

	// 2. Cleanup WishlistItems orphelins (safety net si cascade DB ne déclenche pas)
	try {
		const rawCount = await prisma.$executeRaw`
			DELETE FROM "WishlistItem"
			WHERE id IN (
				SELECT wi.id FROM "WishlistItem" wi
				WHERE NOT EXISTS (
					SELECT 1 FROM "Wishlist" w WHERE w.id = wi."wishlistId"
				)
				LIMIT ${CLEANUP_DELETE_LIMIT}
			)
		`;

		orphanedItemsCount = Number(rawCount);

		if (orphanedItemsCount > 0) {
			logger.info("Cleaned up orphaned wishlist items", {
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
