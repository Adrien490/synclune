import { prisma, notDeleted } from "@/shared/lib/prisma";

import { cacheCustomizationStats } from "../constants/cache";
import { OPEN_STATUSES, CLOSED_STATUSES } from "../constants/status.constants";
import type { CustomizationStats } from "../types/customization.types";

// ============================================================================
// DATA FUNCTION
// ============================================================================

export async function getCustomizationStats(): Promise<CustomizationStats> {
	"use cache: remote";
	cacheCustomizationStats();

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [total, pending, inProgress, completed, open, closed, thisMonth] = await Promise.all([
		// Total
		prisma.customizationRequest.count({
			where: notDeleted,
		}),
		// Pending
		prisma.customizationRequest.count({
			where: { ...notDeleted, status: "PENDING" },
		}),
		// In Progress
		prisma.customizationRequest.count({
			where: { ...notDeleted, status: "IN_PROGRESS" },
		}),
		// Completed
		prisma.customizationRequest.count({
			where: { ...notDeleted, status: "COMPLETED" },
		}),
		// Open (non finalisés)
		prisma.customizationRequest.count({
			where: { ...notDeleted, status: { in: OPEN_STATUSES } },
		}),
		// Closed (finalisés)
		prisma.customizationRequest.count({
			where: { ...notDeleted, status: { in: CLOSED_STATUSES } },
		}),
		// This month
		prisma.customizationRequest.count({
			where: {
				...notDeleted,
				createdAt: { gte: startOfMonth },
			},
		}),
	]);

	return {
		total,
		pending,
		inProgress,
		completed,
		open,
		closed,
		thisMonth,
	};
}
