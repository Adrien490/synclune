import { describe, it, expect, vi, beforeEach } from "vitest"
import { VALID_PRODUCT_ID } from "@/test/factories"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockIsAdmin,
	mockBuildCursorPagination,
	mockProcessCursorResults,
	mockBuildReviewWhereClause,
	mockBuildReviewOrderBy,
	mockHasSortByInput,
	mockStripDeletedResponses,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: {
			findMany: vi.fn(),
			count: vi.fn(),
			groupBy: vi.fn(),
		},
	},
	mockIsAdmin: vi.fn(),
	mockBuildCursorPagination: vi.fn(),
	mockProcessCursorResults: vi.fn(),
	mockBuildReviewWhereClause: vi.fn(),
	mockBuildReviewOrderBy: vi.fn(),
	mockHasSortByInput: vi.fn(),
	mockStripDeletedResponses: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }))
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/modules/auth/utils/guards", () => ({ isAdmin: mockIsAdmin }))
vi.mock("@/shared/lib/pagination", () => ({
	buildCursorPagination: mockBuildCursorPagination,
	processCursorResults: mockProcessCursorResults,
}))
vi.mock("../../services/review-query-builder", () => ({
	buildReviewWhereClause: mockBuildReviewWhereClause,
	buildReviewOrderBy: mockBuildReviewOrderBy,
	hasSortByInput: mockHasSortByInput,
}))
vi.mock("../../utils/strip-deleted-response", () => ({
	stripDeletedResponses: mockStripDeletedResponses,
}))
vi.mock("../../constants/cache", () => ({
	cacheProductReviews: vi.fn(),
	cacheReviewsAdmin: vi.fn(),
}))
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ADMIN_SELECT: { id: true },
	REVIEW_PUBLIC_SELECT: { id: true },
	GET_REVIEWS_DEFAULT_SORT_BY: "createdAt-desc",
	GET_REVIEWS_ADMIN_FALLBACK_SORT_BY: "createdAt-desc",
	GET_REVIEWS_DEFAULT_PER_PAGE: 10,
	GET_REVIEWS_MAX_PER_PAGE: 50,
	GET_REVIEWS_SORT_FIELDS: [],
	REVIEW_SORT_FIELD_LABELS: {},
}))

import { getReviews, getAllProductReviews, getReviewCountsByStatus } from "../get-reviews"

// ============================================================================
// HELPERS
// ============================================================================

const emptyPagination = {
	nextCursor: null,
	prevCursor: null,
	hasNextPage: false,
	hasPreviousPage: false,
}

function setupDefaultMocks() {
	mockIsAdmin.mockResolvedValue(false)
	mockHasSortByInput.mockReturnValue(false)
	mockBuildReviewWhereClause.mockReturnValue({})
	mockBuildReviewOrderBy.mockReturnValue({ createdAt: "desc" })
	mockBuildCursorPagination.mockReturnValue({})
	mockPrisma.productReview.count.mockResolvedValue(0)
	mockPrisma.productReview.findMany.mockResolvedValue([])
	mockProcessCursorResults.mockReturnValue({ items: [], pagination: emptyPagination })
	mockStripDeletedResponses.mockImplementation((items: unknown[]) => items)
}

// ============================================================================
// getReviews
// ============================================================================

describe("getReviews", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		setupDefaultMocks()
	})

	it("should return reviews with pagination and totalCount", async () => {
		const reviews = [{ id: "rev-1" }, { id: "rev-2" }]
		mockPrisma.productReview.count.mockResolvedValue(2)
		mockPrisma.productReview.findMany.mockResolvedValue(reviews)
		mockProcessCursorResults.mockReturnValue({
			items: reviews,
			pagination: { ...emptyPagination, hasNextPage: false },
		})
		mockStripDeletedResponses.mockReturnValue(reviews)

		const result = await getReviews({})

		expect(result.reviews).toEqual(reviews)
		expect(result.totalCount).toBe(2)
		expect(result.pagination).toBeDefined()
	})

	it("should use admin fallback sort when admin and no explicit sort", async () => {
		mockIsAdmin.mockResolvedValue(true)
		mockHasSortByInput.mockReturnValue(false)

		await getReviews({}, { isAdmin: true })

		expect(mockBuildReviewWhereClause).toHaveBeenCalled()
	})

	it("should respect explicit isAdmin option over session check", async () => {
		await getReviews({}, { isAdmin: true })

		// Should use admin select
		expect(mockBuildReviewWhereClause).toHaveBeenCalledWith(
			expect.anything(),
			true
		)
	})

	it("should clamp perPage to max", async () => {
		await getReviews({ perPage: 999 })

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ take: 50 })
		)
	})

	it("should clamp perPage to minimum of 1", async () => {
		await getReviews({ perPage: -5 })

		expect(mockBuildCursorPagination).toHaveBeenCalledWith(
			expect.objectContaining({ take: 1 })
		)
	})

	it("should return empty result on error", async () => {
		mockPrisma.productReview.count.mockRejectedValue(new Error("DB down"))

		const result = await getReviews({})

		expect(result.reviews).toEqual([])
		expect(result.totalCount).toBe(0)
		expect(result.pagination.hasNextPage).toBe(false)
	})
})

// ============================================================================
// getAllProductReviews
// ============================================================================

describe("getAllProductReviews", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should fetch published reviews for a product", async () => {
		const reviews = [{ id: "rev-1" }]
		mockPrisma.productReview.findMany.mockResolvedValue(reviews)

		const result = await getAllProductReviews(VALID_PRODUCT_ID)

		expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					productId: VALID_PRODUCT_ID,
					status: "PUBLISHED",
				}),
				orderBy: { createdAt: "desc" },
			})
		)
		expect(result).toBe(reviews)
	})

	it("should apply limit when provided", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([])

		await getAllProductReviews(VALID_PRODUCT_ID, 5)

		expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: 5 })
		)
	})

	it("should not apply take when no limit", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([])

		await getAllProductReviews(VALID_PRODUCT_ID)

		const call = mockPrisma.productReview.findMany.mock.calls[0][0]
		expect(call.take).toBeUndefined()
	})
})

// ============================================================================
// getReviewCountsByStatus
// ============================================================================

describe("getReviewCountsByStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should return published, hidden, and total counts", async () => {
		mockPrisma.productReview.groupBy.mockResolvedValue([
			{ status: "PUBLISHED", _count: { status: 20 } },
			{ status: "HIDDEN", _count: { status: 5 } },
		])

		const result = await getReviewCountsByStatus()

		expect(result).toEqual({ published: 20, hidden: 5, total: 25 })
	})

	it("should return 0 for missing statuses", async () => {
		mockPrisma.productReview.groupBy.mockResolvedValue([])

		const result = await getReviewCountsByStatus()

		expect(result).toEqual({ published: 0, hidden: 0, total: 0 })
	})

	it("should handle only published reviews", async () => {
		mockPrisma.productReview.groupBy.mockResolvedValue([
			{ status: "PUBLISHED", _count: { status: 15 } },
		])

		const result = await getReviewCountsByStatus()

		expect(result).toEqual({ published: 15, hidden: 0, total: 15 })
	})
})
