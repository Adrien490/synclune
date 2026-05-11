import { updateTag } from "next/cache";

import type { CronResult } from "@/modules/cron/lib/cron-result";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

import { STORE_SETTINGS_SINGLETON_ID, getStoreSettingsInvalidationTags } from "../constants/cache";

interface AutoReopenResult extends CronResult {
	reopened: boolean;
}

/**
 * Auto-reopens the store when `reopensAt` has passed.
 *
 * Atomic check-and-set: `updateMany` with WHERE `isClosed=true AND reopensAt<=now`
 * guards against double-reopen if cron fires concurrently with admin manual reopen.
 *
 * Called from `/api/cron/reopen-store` (every 15 min). Idempotent: a second call
 * after success no-ops because WHERE clause filters out the already-open singleton.
 *
 * Exception services/ : transactional service partagé (cron + future contexts).
 * Cf. `01-conventions.md § Services transactionnels partagés`.
 */
export async function autoReopenIfDue(now: Date = new Date()): Promise<AutoReopenResult> {
	const startedAt = Date.now();

	try {
		const result = await prisma.storeSettings.updateMany({
			where: {
				id: STORE_SETTINGS_SINGLETON_ID,
				isClosed: true,
				reopensAt: { lte: now, not: null },
			},
			data: {
				isClosed: false,
				closureMessage: null,
				closedAt: null,
				closedBy: null,
				reopensAt: null,
			},
		});

		if (result.count > 0) {
			getStoreSettingsInvalidationTags().forEach((tag) => updateTag(tag));
			logger.info("Store auto-reopened by cron (reopensAt reached)", {
				cronJob: "reopen-store",
			});
		}

		return {
			reopened: result.count > 0,
			processed: result.count,
			errored: 0,
			skipped: result.count === 0 ? 1 : 0,
			durationMs: Date.now() - startedAt,
		};
	} catch (err) {
		logger.error("auto-reopen failed", err, { cronJob: "reopen-store" });
		return {
			reopened: false,
			processed: 0,
			errored: 1,
			skipped: 0,
			durationMs: Date.now() - startedAt,
		};
	}
}
