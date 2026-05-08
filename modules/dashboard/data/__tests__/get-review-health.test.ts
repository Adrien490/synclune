import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReviewStatsAggregate, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockReviewStatsAggregate: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		productReviewStats: { aggregate: mockReviewStatsAggregate },
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

vi.mock("@sentry/nextjs", () => ({
	startSpan: <T>(_opts: unknown, fn: () => T) => fn(),
}));

vi.mock("@/modules/dashboard/constants/cache", () => ({
	DASHBOARD_CACHE_TAGS: { REVIEW_HEALTH: "dashboard-review-health" },
}));

vi.mock("@/modules/reviews/constants/cache", () => ({
	REVIEWS_CACHE_TAGS: { GLOBAL_STATS: "global-review-stats" },
}));

import { fetchDashboardReviewHealth } from "../get-review-health";

describe("fetchDashboardReviewHealth", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("returns averageRating and totalReviews from the aggregate", async () => {
		mockReviewStatsAggregate.mockResolvedValueOnce({
			_avg: { averageRating: 4.5 },
			_sum: { totalCount: 42 },
		});

		const result = await fetchDashboardReviewHealth();

		expect(result.averageRating).toBe(4.5);
		expect(result.totalReviews).toBe(42);
	});

	it("defaults averageRating and totalReviews to 0 when sum is null", async () => {
		mockReviewStatsAggregate.mockResolvedValueOnce({
			_avg: { averageRating: null },
			_sum: { totalCount: null },
		});

		const result = await fetchDashboardReviewHealth();

		expect(result.averageRating).toBe(0);
		expect(result.totalReviews).toBe(0);
	});

	it("uses the reference cache profile (24h) instead of user (60s)", async () => {
		mockReviewStatsAggregate.mockResolvedValueOnce({
			_avg: { averageRating: 0 },
			_sum: { totalCount: 0 },
		});

		await fetchDashboardReviewHealth();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("attaches dashboard + reviews global stats tags so each domain can invalidate independently", async () => {
		mockReviewStatsAggregate.mockResolvedValueOnce({
			_avg: { averageRating: 0 },
			_sum: { totalCount: 0 },
		});

		await fetchDashboardReviewHealth();

		expect(mockCacheTag).toHaveBeenCalledWith("dashboard-review-health");
		expect(mockCacheTag).toHaveBeenCalledWith("global-review-stats");
	});
});
