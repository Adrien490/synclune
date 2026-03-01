import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		$queryRaw: vi.fn(),
	},
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("../../constants/cache", () => ({
	REVIEWS_CACHE_TAGS: { GLOBAL_STATS: "global-review-stats" },
}));

import { getGlobalReviewStats } from "../get-global-review-stats";

// ============================================================================
// TESTS
// ============================================================================

describe("getGlobalReviewStats", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return weighted average and total reviews", async () => {
		mockPrisma.$queryRaw.mockResolvedValue([{ total_reviews: BigInt(150), weighted_avg: 4.3567 }]);

		const result = await getGlobalReviewStats();

		expect(result.totalReviews).toBe(150);
		expect(result.averageRating).toBe(4.36); // Rounded to 2 decimals
	});

	it("should return 0 when no reviews exist", async () => {
		mockPrisma.$queryRaw.mockResolvedValue([{ total_reviews: BigInt(0), weighted_avg: null }]);

		const result = await getGlobalReviewStats();

		expect(result.totalReviews).toBe(0);
		expect(result.averageRating).toBe(0);
	});

	it("should handle weighted_avg of 0", async () => {
		mockPrisma.$queryRaw.mockResolvedValue([{ total_reviews: BigInt(0), weighted_avg: 0 }]);

		const result = await getGlobalReviewStats();

		expect(result.averageRating).toBe(0);
	});

	it("should return fallback on database error", async () => {
		mockPrisma.$queryRaw.mockRejectedValue(new Error("connection refused"));

		const result = await getGlobalReviewStats();

		expect(result).toEqual({ totalReviews: 0, averageRating: 0 });
	});
});
