import { describe, it, expect, vi, beforeEach } from "vitest"
import { VALID_PRODUCT_ID } from "@/test/factories"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockFormatReviewStats } = vi.hoisted(() => ({
	mockPrisma: {
		productReviewStats: { findUnique: vi.fn() },
	},
	mockFormatReviewStats: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("../../constants/cache", () => ({
	cacheProductReviewStats: vi.fn(),
}))
vi.mock("../../constants/review.constants", () => ({
	REVIEW_STATS_SELECT: {
		totalCount: true,
		averageRating: true,
		rating1Count: true,
		rating2Count: true,
		rating3Count: true,
		rating4Count: true,
		rating5Count: true,
	},
}))
vi.mock("../../services/review-stats.service", () => ({
	formatReviewStats: mockFormatReviewStats,
}))

import {
	getProductReviewStatsRaw,
	getProductReviewStats,
	hasProductReviews,
} from "../get-product-review-stats"

// ============================================================================
// FACTORIES
// ============================================================================

function createRawStats(overrides: Record<string, unknown> = {}) {
	return {
		totalCount: 25,
		averageRating: 4.5,
		rating1Count: 1,
		rating2Count: 2,
		rating3Count: 3,
		rating4Count: 9,
		rating5Count: 10,
		...overrides,
	}
}

// ============================================================================
// getProductReviewStatsRaw
// ============================================================================

describe("getProductReviewStatsRaw", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should return stats with averageRating converted to number", async () => {
		mockPrisma.productReviewStats.findUnique.mockResolvedValue(
			createRawStats({ averageRating: { toNumber: () => 4.5 } })
		)

		const result = await getProductReviewStatsRaw(VALID_PRODUCT_ID)

		expect(result?.averageRating).toBe(4.5)
		expect(typeof result?.averageRating).toBe("number")
	})

	it("should pass through numeric averageRating directly", async () => {
		mockPrisma.productReviewStats.findUnique.mockResolvedValue(createRawStats())

		const result = await getProductReviewStatsRaw(VALID_PRODUCT_ID)

		expect(result?.averageRating).toBe(4.5)
	})

	it("should return null when no stats exist", async () => {
		mockPrisma.productReviewStats.findUnique.mockResolvedValue(null)

		const result = await getProductReviewStatsRaw(VALID_PRODUCT_ID)

		expect(result).toBeNull()
	})
})

// ============================================================================
// getProductReviewStats
// ============================================================================

describe("getProductReviewStats", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should pass raw stats to formatReviewStats", async () => {
		const rawStats = createRawStats()
		mockPrisma.productReviewStats.findUnique.mockResolvedValue(rawStats)
		const formatted = { totalCount: 25, averageRating: 4.5, distribution: [] }
		mockFormatReviewStats.mockReturnValue(formatted)

		const result = await getProductReviewStats(VALID_PRODUCT_ID)

		expect(mockFormatReviewStats).toHaveBeenCalledWith(rawStats)
		expect(result).toBe(formatted)
	})

	it("should call formatReviewStats with null when no stats", async () => {
		mockPrisma.productReviewStats.findUnique.mockResolvedValue(null)
		mockFormatReviewStats.mockReturnValue({ totalCount: 0, averageRating: 0, distribution: [] })

		await getProductReviewStats(VALID_PRODUCT_ID)

		expect(mockFormatReviewStats).toHaveBeenCalledWith(null)
	})
})

// ============================================================================
// hasProductReviews
// ============================================================================

describe("hasProductReviews", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should return true when totalCount > 0", async () => {
		mockPrisma.productReviewStats.findUnique.mockResolvedValue(createRawStats())

		const result = await hasProductReviews(VALID_PRODUCT_ID)

		expect(result).toBe(true)
	})

	it("should return false when totalCount is 0", async () => {
		mockPrisma.productReviewStats.findUnique.mockResolvedValue(createRawStats({ totalCount: 0 }))

		const result = await hasProductReviews(VALID_PRODUCT_ID)

		expect(result).toBe(false)
	})

	it("should return false when no stats exist", async () => {
		mockPrisma.productReviewStats.findUnique.mockResolvedValue(null)

		const result = await hasProductReviews(VALID_PRODUCT_ID)

		expect(result).toBe(false)
	})
})
