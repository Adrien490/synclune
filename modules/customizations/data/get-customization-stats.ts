import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";

import { cacheCustomizationStats } from "../constants/cache";
import { OPEN_STATUSES, CLOSED_STATUSES } from "../constants/status.constants";
import type { CustomizationStats } from "../types/customization.types";

const EMPTY_STATS: CustomizationStats = {
	total: 0,
	pending: 0,
	inProgress: 0,
	completed: 0,
	open: 0,
	closed: 0,
	thisMonth: 0,
};

// ============================================================================
// DATA FUNCTION
// ============================================================================

export async function getCustomizationStats(): Promise<CustomizationStats> {
	const adminCheck = await requireAdmin();
	if ("error" in adminCheck) return EMPTY_STATS;

	return fetchCustomizationStats();
}

async function fetchCustomizationStats(): Promise<CustomizationStats> {
	"use cache";
	cacheCustomizationStats();

	try {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [statusGroups, thisMonth] = await Promise.all([
			// Single groupBy query for all status-based counts
			prisma.customizationRequest.groupBy({
				by: ["status"],
				where: notDeleted,
				_count: true,
			}),
			// This month needs a separate query (different where clause)
			prisma.customizationRequest.count({
				where: {
					...notDeleted,
					createdAt: { gte: startOfMonth },
				},
			}),
		]);

		// Build counts from groupBy results
		const countByStatus = Object.fromEntries(
			statusGroups.map((g) => [g.status, g._count]),
		) as Partial<Record<string, number>>;

		const pending = countByStatus.PENDING ?? 0;
		const inProgress = countByStatus.IN_PROGRESS ?? 0;
		const completed = countByStatus.COMPLETED ?? 0;

		const open = OPEN_STATUSES.reduce((sum, s) => sum + (countByStatus[s] ?? 0), 0);
		const closed = CLOSED_STATUSES.reduce((sum, s) => sum + (countByStatus[s] ?? 0), 0);
		const total = open + closed;

		return {
			total,
			pending,
			inProgress,
			completed,
			open,
			closed,
			thisMonth,
		};
	} catch (error) {
		Sentry.captureException(error);
		logger.error("Failed to fetch customization stats", error, {
			service: "fetchCustomizationStats",
		});
		return EMPTY_STATS;
	}
}
