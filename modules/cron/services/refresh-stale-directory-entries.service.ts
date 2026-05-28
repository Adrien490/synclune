import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { refreshCustomerRouting } from "@/modules/users/services/refresh-customer-routing.service";
import { BATCH_SIZE_MEDIUM } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

/**
 * Cron mensuel : rafraîchit le cache annuaire DGFiP pour les users B2B/B2G
 * dont la dernière vérification date de plus de 30 jours ET qui ont passé
 * commande dans les 90 derniers jours (filtre anti-balayage des users dormants).
 *
 * Référence : audit Phase 5 (cron mentionné dans le plan ExitPlanMode).
 */
const DIRECTORY_REFRESH_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_ORDER_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;

export async function refreshStaleDirectoryEntries(): Promise<CronResult> {
	logger.info("Starting directory cache refresh sweep", {
		cronJob: "refresh-stale-directory-entries",
	});

	const directoryCutoff = new Date(Date.now() - DIRECTORY_REFRESH_THRESHOLD_MS);
	const recentOrderCutoff = new Date(Date.now() - RECENT_ORDER_THRESHOLD_MS);

	const candidates = await prisma.user.findMany({
		where: {
			customerType: { in: ["B2B", "B2G"] },
			companySiret: { not: null },
			deletedAt: null,
			OR: [{ directoryLastCheckedAt: null }, { directoryLastCheckedAt: { lt: directoryCutoff } }],
			orders: {
				some: {
					createdAt: { gte: recentOrderCutoff },
					deletedAt: null,
				},
			},
		},
		select: { id: true },
		take: BATCH_SIZE_MEDIUM,
	});

	if (candidates.length === 0) {
		return { processed: 0, errored: 0, skipped: 0 };
	}

	let processed = 0;
	let errored = 0;
	let skipped = 0;

	for (const candidate of candidates) {
		try {
			const result = await refreshCustomerRouting(candidate.id);
			if (result.status === "REFRESHED") {
				processed++;
			} else if (result.status === "UNAVAILABLE") {
				// Annuaire down — retry au prochain run
				skipped++;
			} else {
				skipped++;
			}
		} catch (error) {
			errored++;
			logger.error(`Failed to refresh directory for user ${candidate.id}`, error, {
				cronJob: "refresh-stale-directory-entries",
				userId: candidate.id,
			});
		}
	}

	return {
		processed,
		errored,
		skipped,
		hasMore: candidates.length === BATCH_SIZE_MEDIUM,
	};
}
