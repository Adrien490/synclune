import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

import type { ExportReviewsPeriod } from "../schemas/review.schemas";

// ============================================================================
// TYPES
// ============================================================================

export type ReviewExportRow = Awaited<ReturnType<typeof fetchReviewsForExport>>[number];

// ============================================================================
// PERIOD BOUNDARIES
// ============================================================================

function getPeriodStart(period: ExportReviewsPeriod): Date | null {
	const now = Date.now();
	const day = 24 * 60 * 60 * 1000;
	switch (period) {
		case "7d":
			return new Date(now - 7 * day);
		case "30d":
			return new Date(now - 30 * day);
		case "90d":
			return new Date(now - 90 * day);
		case "year":
			return new Date(now - 365 * day);
		case "all":
			return null;
	}
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Recupere les avis pour export admin (pas de pagination, inclut tout le detail).
 *
 * @param period Fenetre temporelle filtree sur createdAt
 * @param includeHidden Inclut les avis HIDDEN (moderation manuelle)
 * @param includeDeleted Inclut les avis soft-deleted (RGPD/legal audit)
 * @param limit Nombre max de lignes pour proteger la memoire (defaut 10 000)
 */
export async function getReviewsForExport(
	period: ExportReviewsPeriod,
	includeHidden: boolean,
	includeDeleted: boolean,
	limit = 10000,
) {
	const where: Prisma.ProductReviewWhereInput = {};

	const since = getPeriodStart(period);
	if (since) {
		where.createdAt = { gte: since };
	}

	if (!includeHidden) {
		where.status = "PUBLISHED";
	}

	if (!includeDeleted) {
		where.deletedAt = null;
	}

	return fetchReviewsForExport(where, limit);
}

async function fetchReviewsForExport(where: Prisma.ProductReviewWhereInput, limit: number) {
	return prisma.productReview.findMany({
		where,
		orderBy: { createdAt: "desc" },
		take: limit,
		select: {
			id: true,
			rating: true,
			title: true,
			content: true,
			status: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			product: {
				select: {
					id: true,
					title: true,
					slug: true,
				},
			},
			medias: {
				select: { url: true },
				orderBy: { position: "asc" },
			},
			response: {
				select: {
					content: true,
					authorName: true,
					createdAt: true,
					deletedAt: true,
				},
			},
			orderItem: {
				select: {
					id: true,
					order: {
						select: {
							id: true,
							orderNumber: true,
							reviewRequestSentAt: true,
							reviewReminderSentAt: true,
						},
					},
				},
			},
		},
	});
}
