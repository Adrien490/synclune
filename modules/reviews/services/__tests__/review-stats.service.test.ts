import { describe, it, expect, vi } from "vitest";
import { formatReviewStats, recomputeProductReviewStatsBatch } from "../review-stats.service";
import type { ReviewStats } from "../../types/review.types";
import type { PrismaTransaction } from "@/shared/types/prisma";

vi.mock("../../constants/review.constants", () => ({
	REVIEW_CONFIG: { MAX_RATING: 5 },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {
		join: (arr: unknown[]) => ({ __sql: "join", values: arr }),
	},
}));

// ============================================================================
// formatReviewStats
// ============================================================================

describe("formatReviewStats", () => {
	it("returns zeros and an empty distribution when input is null", () => {
		const result = formatReviewStats(null);

		expect(result.totalCount).toBe(0);
		expect(result.averageRating).toBe(0);
		expect(result.distribution).toHaveLength(5);
		expect(result.distribution.every((d) => d.count === 0 && d.percentage === 0)).toBe(true);
	});

	it("returns zeros for stats with totalCount 0", () => {
		const stats: ReviewStats = {
			totalCount: 0,
			averageRating: 4.2,
			rating1Count: 0,
			rating2Count: 0,
			rating3Count: 0,
			rating4Count: 0,
			rating5Count: 0,
		};

		const result = formatReviewStats(stats);

		expect(result.totalCount).toBe(0);
		expect(result.averageRating).toBe(0);
		expect(result.distribution.every((d) => d.count === 0 && d.percentage === 0)).toBe(true);
	});

	it("calculates percentages correctly", () => {
		const stats: ReviewStats = {
			totalCount: 10,
			averageRating: 4.0,
			rating1Count: 0,
			rating2Count: 0,
			rating3Count: 0,
			rating4Count: 4,
			rating5Count: 6,
		};

		const result = formatReviewStats(stats);

		const entry5 = result.distribution.find((d) => d.rating === 5);
		const entry4 = result.distribution.find((d) => d.rating === 4);

		expect(entry5?.percentage).toBe(60);
		expect(entry4?.percentage).toBe(40);
	});

	it("returns the distribution ordered from 5 to 1", () => {
		const stats: ReviewStats = {
			totalCount: 5,
			averageRating: 3.0,
			rating1Count: 1,
			rating2Count: 1,
			rating3Count: 1,
			rating4Count: 1,
			rating5Count: 1,
		};

		const result = formatReviewStats(stats);
		const ratings = result.distribution.map((d) => d.rating);

		expect(ratings).toEqual([5, 4, 3, 2, 1]);
	});

	it("gives 100% to the only rating that was given", () => {
		const stats: ReviewStats = {
			totalCount: 8,
			averageRating: 5.0,
			rating1Count: 0,
			rating2Count: 0,
			rating3Count: 0,
			rating4Count: 0,
			rating5Count: 8,
		};

		const result = formatReviewStats(stats);

		const entry5 = result.distribution.find((d) => d.rating === 5);
		expect(entry5?.percentage).toBe(100);
		expect(entry5?.count).toBe(8);

		const otherEntries = result.distribution.filter((d) => d.rating !== 5);
		expect(otherEntries.every((d) => d.percentage === 0 && d.count === 0)).toBe(true);
	});

	it("rounds percentages to the nearest integer", () => {
		// 1 / 3 = 33.33...% -> rounds to 33
		// 2 / 3 = 66.66...% -> rounds to 67
		const stats: ReviewStats = {
			totalCount: 3,
			averageRating: 4.33,
			rating1Count: 0,
			rating2Count: 0,
			rating3Count: 0,
			rating4Count: 1,
			rating5Count: 2,
		};

		const result = formatReviewStats(stats);

		const entry5 = result.distribution.find((d) => d.rating === 5);
		const entry4 = result.distribution.find((d) => d.rating === 4);

		expect(entry5?.percentage).toBe(67);
		expect(entry4?.percentage).toBe(33);
	});

	it("preserves averageRating and totalCount from input", () => {
		const stats: ReviewStats = {
			totalCount: 42,
			averageRating: 4.76,
			rating1Count: 0,
			rating2Count: 1,
			rating3Count: 2,
			rating4Count: 9,
			rating5Count: 30,
		};

		const result = formatReviewStats(stats);

		expect(result.totalCount).toBe(42);
		expect(result.averageRating).toBe(4.76);
	});
});

// ============================================================================
// recomputeProductReviewStatsBatch
// ============================================================================

function createMockTx() {
	const queryRaw = vi.fn();
	const upsert = vi.fn();
	const tx = {
		$queryRaw: queryRaw,
		productReviewStats: { upsert },
	} as unknown as PrismaTransaction;
	return { tx, queryRaw, upsert };
}

describe("recomputeProductReviewStatsBatch", () => {
	it("returns early without DB calls when productIds is empty", async () => {
		const { tx, queryRaw, upsert } = createMockTx();

		await recomputeProductReviewStatsBatch(tx, []);

		expect(queryRaw).not.toHaveBeenCalled();
		expect(upsert).not.toHaveBeenCalled();
	});

	it("upserts each row returned by the GROUP BY query", async () => {
		const { tx, queryRaw, upsert } = createMockTx();
		queryRaw.mockResolvedValue([
			{
				product_id: "prod-A",
				total_count: 3n,
				avg_rating: 4.5,
				rating1: 0n,
				rating2: 0n,
				rating3: 0n,
				rating4: 1n,
				rating5: 2n,
			},
		]);
		upsert.mockResolvedValue({});

		await recomputeProductReviewStatsBatch(tx, ["prod-A"]);

		expect(queryRaw).toHaveBeenCalledTimes(1);
		expect(upsert).toHaveBeenCalledTimes(1);
		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { productId: "prod-A" },
				create: expect.objectContaining({
					productId: "prod-A",
					totalCount: 3,
					averageRating: 4.5,
					rating5Count: 2,
					rating4Count: 1,
				}),
			}),
		);
	});

	it("zeroes stats for productIds with no PUBLISHED reviews", async () => {
		const { tx, queryRaw, upsert } = createMockTx();
		// Only prod-A has rows ; prod-B should still be reset to zeros.
		queryRaw.mockResolvedValue([
			{
				product_id: "prod-A",
				total_count: 2n,
				avg_rating: 5,
				rating1: 0n,
				rating2: 0n,
				rating3: 0n,
				rating4: 0n,
				rating5: 2n,
			},
		]);
		upsert.mockResolvedValue({});

		await recomputeProductReviewStatsBatch(tx, ["prod-A", "prod-B"]);

		expect(upsert).toHaveBeenCalledTimes(2);
		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { productId: "prod-B" },
				create: expect.objectContaining({
					productId: "prod-B",
					totalCount: 0,
					averageRating: 0,
					rating1Count: 0,
				}),
			}),
		);
	});

	it("converts null avg_rating to 0", async () => {
		const { tx, queryRaw, upsert } = createMockTx();
		queryRaw.mockResolvedValue([
			{
				product_id: "prod-A",
				total_count: 0n,
				avg_rating: null,
				rating1: 0n,
				rating2: 0n,
				rating3: 0n,
				rating4: 0n,
				rating5: 0n,
			},
		]);
		upsert.mockResolvedValue({});

		await recomputeProductReviewStatsBatch(tx, ["prod-A"]);

		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({ averageRating: 0 }),
			}),
		);
	});

	it("issues a single $queryRaw call regardless of product count", async () => {
		const { tx, queryRaw, upsert } = createMockTx();
		queryRaw.mockResolvedValue([]);
		upsert.mockResolvedValue({});

		await recomputeProductReviewStatsBatch(tx, ["a", "b", "c", "d", "e"]);

		expect(queryRaw).toHaveBeenCalledTimes(1);
		// All 5 products were absent from the result → 5 zero-upserts in parallel.
		expect(upsert).toHaveBeenCalledTimes(5);
	});
});
