import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const CRON_JOB = "cleanup-sessions";

/**
 * Purge les sessions Better Auth expirées.
 *
 * Invoquée comme passe de la route cron `cleanup-pending-orders` (pas de cron
 * dédié — chaque cron supplémentaire réveille la base Neon). Le cron
 * `cleanup-sessions` historique était parti avec l'espace client : plus rien
 * ne bornait la table `Session` (Better Auth ne purge pas lui-même les lignes
 * expirées, il se contente de les ignorer à la lecture). Réintroduite au
 * Lot 0 (SIMPLIFICATION.md S3.7).
 *
 * Grâce de 24 h après `expiresAt` : une session expirée est déjà inerte (le
 * cookie ne la ressuscite pas), la marge évite seulement de purger sous une
 * horloge décalée. Batch borné par `CLEANUP_DELETE_LIMIT` — le reliquat part
 * au run suivant (`hasMore`).
 */
const SESSION_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export async function cleanupExpiredSessions(): Promise<CronResult> {
	const cutoff = new Date(Date.now() - SESSION_GRACE_PERIOD_MS);
	let deletedCount = 0;
	let errored = 0;
	let hasMore = false;

	try {
		const expired = await prisma.session.findMany({
			where: { expiresAt: { lt: cutoff } },
			select: { id: true },
			take: CLEANUP_DELETE_LIMIT,
		});

		if (expired.length > 0) {
			const { count } = await prisma.session.deleteMany({
				where: { id: { in: expired.map((s) => s.id) } },
			});
			deletedCount = count;
			hasMore = expired.length === CLEANUP_DELETE_LIMIT;

			logger.info("Cleaned up expired sessions", { cronJob: CRON_JOB, deletedCount, hasMore });
		}
	} catch (error) {
		logger.error("Error during expired sessions cleanup", error, { cronJob: CRON_JOB });
		Sentry.withScope((scope) => {
			scope.setTag("cronJob", CRON_JOB);
			scope.setLevel("error");
			scope.setFingerprint(["cron", CRON_JOB, "delete-expired"]);
			Sentry.captureException(error);
		});
		errored++;
	}

	return {
		processed: deletedCount,
		errored,
		skipped: 0,
		deletedSessions: deletedCount,
		hasMore,
	};
}
