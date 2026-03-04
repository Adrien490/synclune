import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_CUID, VALID_CUID_2 } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockEnforceRateLimit, mockGetReviews } = vi.hoisted(() => ({
	mockEnforceRateLimit: vi.fn(),
	mockGetReviews: vi.fn(),
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	REVIEW_LOAD_MORE_LIMIT: "review-load-more",
}));

vi.mock("../../data/get-reviews", () => ({
	getReviews: mockGetReviews,
}));

import { loadMoreReviews } from "../load-more-reviews";

// ============================================================================
// CONSTANTS
// ============================================================================

const defaultParams = { productId: VALID_CUID, cursor: VALID_CUID_2 };

const mockReview = {
	id: "r1",
	rating: 5,
	title: "Ok",
	content: "Content",
	createdAt: new Date(),
	user: { name: "A", image: null },
	medias: [],
	response: null,
};

const mockGetReviewsResult = {
	reviews: [mockReview],
	pagination: {
		nextCursor: "cursor-2",
		prevCursor: null,
		hasNextPage: true,
		hasPreviousPage: false,
	},
	totalCount: 20,
};

// ============================================================================
// TESTS
// ============================================================================

describe("loadMoreReviews", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetReviews.mockResolvedValue(mockGetReviewsResult);
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return EMPTY when params are invalid", async () => {
		const result = await loadMoreReviews({
			productId: "not-a-cuid",
			cursor: VALID_CUID_2,
		});

		expect(result.reviews).toEqual([]);
		expect(result.nextCursor).toBeNull();
		expect(result.hasMore).toBe(false);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
		expect(mockGetReviews).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	it("should return EMPTY without error when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { message: "Too many requests" } });

		const result = await loadMoreReviews(defaultParams);

		expect(result.reviews).toEqual([]);
		expect(result.nextCursor).toBeNull();
		expect(result.hasMore).toBe(false);
		expect(result.error).toBeUndefined();
	});

	it("should not call getReviews when rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { message: "Too many requests" } });

		await loadMoreReviews(defaultParams);

		expect(mockGetReviews).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Success
	// ──────────────────────────────────────────────────────────────

	it("should return reviews, nextCursor, and hasMore from getReviews on success", async () => {
		const result = await loadMoreReviews(defaultParams);

		expect(result.reviews).toEqual([mockReview]);
		expect(result.nextCursor).toBe("cursor-2");
		expect(result.hasMore).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it("should pass correct params to getReviews", async () => {
		await loadMoreReviews(defaultParams);

		expect(mockGetReviews).toHaveBeenCalledWith(
			{
				productId: VALID_CUID,
				cursor: VALID_CUID_2,
				perPage: 10,
				direction: "forward",
				filterRating: undefined,
				sortBy: undefined,
			},
			{ isAdmin: false },
		);
	});

	it("should pass optional filterRating and sortBy to getReviews", async () => {
		await loadMoreReviews({
			...defaultParams,
			filterRating: 4,
			sortBy: "createdAt-desc",
		});

		expect(mockGetReviews).toHaveBeenCalledWith(
			{
				productId: VALID_CUID,
				cursor: VALID_CUID_2,
				perPage: 10,
				direction: "forward",
				filterRating: 4,
				sortBy: "createdAt-desc",
			},
			{ isAdmin: false },
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should return EMPTY with error message when getReviews throws", async () => {
		mockGetReviews.mockRejectedValue(new Error("DB failure"));

		const result = await loadMoreReviews(defaultParams);

		expect(result.reviews).toEqual([]);
		expect(result.nextCursor).toBeNull();
		expect(result.hasMore).toBe(false);
		expect(result.error).toBe("Impossible de charger plus d'avis");
	});

	// ──────────────────────────────────────────────────────────────
	// Pagination edge cases
	// ──────────────────────────────────────────────────────────────

	it("should return hasMore=false when getReviews returns no more pages", async () => {
		mockGetReviews.mockResolvedValue({
			reviews: [mockReview],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
			totalCount: 1,
		});

		const result = await loadMoreReviews(defaultParams);

		expect(result.hasMore).toBe(false);
		expect(result.nextCursor).toBeNull();
	});
});
