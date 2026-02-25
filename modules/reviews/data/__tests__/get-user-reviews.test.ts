import { describe, it, expect, vi, beforeEach } from "vitest"
import { VALID_USER_ID } from "@/test/factories"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockGetSession, mockStripDeletedResponses } = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findMany: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockStripDeletedResponses: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }))
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}))
vi.mock("../../constants/cache", () => ({
	REVIEWS_CACHE_TAGS: {
		USER: (userId: string) => `reviews-user-${userId}`,
	},
}))
vi.mock("../../constants/review.constants", () => ({
	REVIEW_USER_SELECT: {},
}))
vi.mock("../../utils/strip-deleted-response", () => ({
	stripDeletedResponses: mockStripDeletedResponses,
}))

import { getUserReviews } from "../get-user-reviews"

// ============================================================================
// TESTS
// ============================================================================

describe("getUserReviews", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should return empty array when no session", async () => {
		mockGetSession.mockResolvedValue(null)

		const result = await getUserReviews()

		expect(result).toEqual([])
		expect(mockPrisma.productReview.findMany).not.toHaveBeenCalled()
	})

	it("should return empty array when session has no user id", async () => {
		mockGetSession.mockResolvedValue({ user: { id: undefined } })

		const result = await getUserReviews()

		expect(result).toEqual([])
	})

	it("should fetch and return user reviews", async () => {
		mockGetSession.mockResolvedValue({ user: { id: VALID_USER_ID } })
		const reviews = [{ id: "rev-1", content: "Great" }]
		mockPrisma.productReview.findMany.mockResolvedValue(reviews)
		mockStripDeletedResponses.mockReturnValue(reviews)

		const result = await getUserReviews()

		expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ userId: VALID_USER_ID }),
				orderBy: { createdAt: "desc" },
			})
		)
		expect(mockStripDeletedResponses).toHaveBeenCalledWith(reviews)
		expect(result).toBe(reviews)
	})
})
