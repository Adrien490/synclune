import { Prisma } from "@/app/generated/prisma/client";
import type { PrismaTransaction } from "@/shared/types/prisma";
import type {
	ProductReviewStatistics,
	RatingDistribution,
	ReviewStats,
} from "../types/review.types";
import { REVIEW_CONFIG } from "../constants/review.constants";

// ============================================================================
// REVIEW STATS SERVICE
// Functions for managing product review statistics
// ============================================================================

/**
 * Structure des compteurs de notes par étoile
 */
interface RatingCounts {
	rating1Count: number;
	rating2Count: number;
	rating3Count: number;
	rating4Count: number;
	rating5Count: number;
}

/** Raw query result shape for review stats computation */
interface ReviewStatsRow {
	total_count: bigint;
	avg_rating: number | null;
	rating1: bigint;
	rating2: bigint;
	rating3: bigint;
	rating4: bigint;
	rating5: bigint;
}

/**
 * Met à jour les statistiques agrégées des avis d'un produit
 * À appeler dans une transaction après création/modification/suppression d'un avis
 * Uses a single raw query instead of separate aggregate + groupBy for efficiency
 *
 * @param tx - Transaction Prisma
 * @param productId - ID du produit
 */
export async function updateProductReviewStats(
	tx: PrismaTransaction,
	productId: string,
): Promise<void> {
	// Single query: count, average, and per-rating distribution in one pass
	const [stats] = await tx.$queryRaw<[ReviewStatsRow]>`
		SELECT
			COUNT(*)::bigint AS total_count,
			AVG(rating) AS avg_rating,
			COUNT(*) FILTER (WHERE rating = 1)::bigint AS rating1,
			COUNT(*) FILTER (WHERE rating = 2)::bigint AS rating2,
			COUNT(*) FILTER (WHERE rating = 3)::bigint AS rating3,
			COUNT(*) FILTER (WHERE rating = 4)::bigint AS rating4,
			COUNT(*) FILTER (WHERE rating = 5)::bigint AS rating5
		FROM "ProductReview"
		WHERE "productId" = ${productId}
			AND status = 'PUBLISHED'
			AND "deletedAt" IS NULL
	`;

	const totalCount = Number(stats.total_count);
	const averageRating = stats.avg_rating ? Number(stats.avg_rating) : 0;
	const ratingCounts: RatingCounts = {
		rating1Count: Number(stats.rating1),
		rating2Count: Number(stats.rating2),
		rating3Count: Number(stats.rating3),
		rating4Count: Number(stats.rating4),
		rating5Count: Number(stats.rating5),
	};

	// Upsert les statistiques
	await tx.productReviewStats.upsert({
		where: { productId },
		create: {
			productId,
			totalCount,
			averageRating,
			...ratingCounts,
		},
		update: {
			totalCount,
			averageRating,
			...ratingCounts,
		},
	});
}

/** Raw query row for batched per-product stats computation */
interface ReviewStatsBatchRow {
	product_id: string;
	total_count: bigint;
	avg_rating: number | null;
	rating1: bigint;
	rating2: bigint;
	rating3: bigint;
	rating4: bigint;
	rating5: bigint;
}

/**
 * Recompute stats for many products in one round-trip per phase.
 *
 * - 1 SELECT GROUP BY productId for all products (1 query)
 * - N upserts in parallel (Prisma sérialise sur la même tx mais évite les N
 *   round-trips séquentiels du précédent code).
 *
 * À utiliser depuis les bulk actions admin où une boucle séquentielle
 * `await updateProductReviewStats(tx, productId)` provoquait des timeouts
 * transaction (cf. audit reviews 2026-05-11 P1.2).
 */
export async function recomputeProductReviewStatsBatch(
	tx: PrismaTransaction,
	productIds: string[],
): Promise<void> {
	if (productIds.length === 0) return;

	const rows = await tx.$queryRaw<ReviewStatsBatchRow[]>`
		SELECT
			"productId" AS product_id,
			COUNT(*)::bigint AS total_count,
			AVG(rating) AS avg_rating,
			COUNT(*) FILTER (WHERE rating = 1)::bigint AS rating1,
			COUNT(*) FILTER (WHERE rating = 2)::bigint AS rating2,
			COUNT(*) FILTER (WHERE rating = 3)::bigint AS rating3,
			COUNT(*) FILTER (WHERE rating = 4)::bigint AS rating4,
			COUNT(*) FILTER (WHERE rating = 5)::bigint AS rating5
		FROM "ProductReview"
		WHERE "productId" IN (${Prisma.join(productIds)})
			AND status = 'PUBLISHED'
			AND "deletedAt" IS NULL
		GROUP BY "productId"
	`;

	// Garder une trace des productIds n'ayant aucun review PUBLISHED → stats à 0.
	const seen = new Set(rows.map((r) => r.product_id));
	const empties = productIds.filter((id) => !seen.has(id));

	await Promise.all([
		...rows.map((row) => {
			const counts: RatingCounts = {
				rating1Count: Number(row.rating1),
				rating2Count: Number(row.rating2),
				rating3Count: Number(row.rating3),
				rating4Count: Number(row.rating4),
				rating5Count: Number(row.rating5),
			};
			const totalCount = Number(row.total_count);
			const averageRating = row.avg_rating ? Number(row.avg_rating) : 0;
			return tx.productReviewStats.upsert({
				where: { productId: row.product_id },
				create: {
					productId: row.product_id,
					totalCount,
					averageRating,
					...counts,
				},
				update: {
					totalCount,
					averageRating,
					...counts,
				},
			});
		}),
		...empties.map((productId) =>
			tx.productReviewStats.upsert({
				where: { productId },
				create: {
					productId,
					totalCount: 0,
					averageRating: 0,
					rating1Count: 0,
					rating2Count: 0,
					rating3Count: 0,
					rating4Count: 0,
					rating5Count: 0,
				},
				update: {
					totalCount: 0,
					averageRating: 0,
					rating1Count: 0,
					rating2Count: 0,
					rating3Count: 0,
					rating4Count: 0,
					rating5Count: 0,
				},
			}),
		),
	]);
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// Pure functions for formatting review statistics
// ============================================================================

/**
 * Transforme les statistiques brutes en statistiques UI-friendly
 * avec distribution calculée en pourcentages
 *
 * @param stats - Statistiques brutes depuis la base de données
 * @returns Statistiques formatées pour l'UI
 */
export function formatReviewStats(stats: ReviewStats | null): ProductReviewStatistics {
	if (!stats || stats.totalCount === 0) {
		return {
			totalCount: 0,
			averageRating: 0,
			distribution: Array.from({ length: REVIEW_CONFIG.MAX_RATING }, (_, i) => ({
				rating: i + 1,
				count: 0,
				percentage: 0,
			})),
		};
	}

	const distribution: RatingDistribution[] = [
		{
			rating: 5,
			count: stats.rating5Count,
			percentage: Math.round((stats.rating5Count / stats.totalCount) * 100),
		},
		{
			rating: 4,
			count: stats.rating4Count,
			percentage: Math.round((stats.rating4Count / stats.totalCount) * 100),
		},
		{
			rating: 3,
			count: stats.rating3Count,
			percentage: Math.round((stats.rating3Count / stats.totalCount) * 100),
		},
		{
			rating: 2,
			count: stats.rating2Count,
			percentage: Math.round((stats.rating2Count / stats.totalCount) * 100),
		},
		{
			rating: 1,
			count: stats.rating1Count,
			percentage: Math.round((stats.rating1Count / stats.totalCount) * 100),
		},
	];

	return {
		totalCount: stats.totalCount,
		averageRating: stats.averageRating,
		distribution,
	};
}
