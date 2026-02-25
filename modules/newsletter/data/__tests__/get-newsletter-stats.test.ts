import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: {
			count: vi.fn(),
		},
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}))
vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}))
vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: {
		CONFIRMED: "CONFIRMED",
		PENDING: "PENDING",
		UNSUBSCRIBED: "UNSUBSCRIBED",
	},
}))
vi.mock("../constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: { LIST: "newsletter-subscribers-list" },
}))

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { getNewsletterStats } from "../get-newsletter-stats"

// ============================================================================
// TESTS
// ============================================================================

describe("getNewsletterStats", () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	// -------------------------------------------------------------------------
	// Returns correct stats
	// -------------------------------------------------------------------------

	it("should return correct totalSubscribers, activeSubscribers and inactiveSubscribers", async () => {
		mockPrisma.newsletterSubscriber.count
			.mockResolvedValueOnce(120) // total
			.mockResolvedValueOnce(90)  // active (CONFIRMED)

		const result = await getNewsletterStats()

		expect(result).toEqual({
			totalSubscribers: 120,
			activeSubscribers: 90,
			inactiveSubscribers: 30,
		})
	})

	// -------------------------------------------------------------------------
	// Calculates inactiveSubscribers correctly
	// -------------------------------------------------------------------------

	it("should calculate inactiveSubscribers as total minus active", async () => {
		mockPrisma.newsletterSubscriber.count
			.mockResolvedValueOnce(50)
			.mockResolvedValueOnce(50)

		const result = await getNewsletterStats()

		expect(result.inactiveSubscribers).toBe(0)
	})

	it("should return inactiveSubscribers of 0 when all subscribers are active", async () => {
		mockPrisma.newsletterSubscriber.count
			.mockResolvedValueOnce(10)
			.mockResolvedValueOnce(10)

		const result = await getNewsletterStats()

		expect(result.inactiveSubscribers).toBe(0)
	})

	it("should return inactiveSubscribers equal to total when no active subscribers", async () => {
		mockPrisma.newsletterSubscriber.count
			.mockResolvedValueOnce(15)
			.mockResolvedValueOnce(0)

		const result = await getNewsletterStats()

		expect(result.inactiveSubscribers).toBe(15)
	})

	// -------------------------------------------------------------------------
	// Filters by notDeleted
	// -------------------------------------------------------------------------

	it("should exclude soft-deleted subscribers from both counts", async () => {
		mockPrisma.newsletterSubscriber.count
			.mockResolvedValueOnce(0)
			.mockResolvedValueOnce(0)

		await getNewsletterStats()

		// Both count calls should use the notDeleted filter
		const [totalCall, activeCall] = mockPrisma.newsletterSubscriber.count.mock.calls
		expect(totalCall[0].where).toMatchObject({ deletedAt: null })
		expect(activeCall[0].where).toMatchObject({ deletedAt: null })
	})

	// -------------------------------------------------------------------------
	// Active = CONFIRMED status
	// -------------------------------------------------------------------------

	it("should count only CONFIRMED subscribers as active", async () => {
		mockPrisma.newsletterSubscriber.count
			.mockResolvedValueOnce(0)
			.mockResolvedValueOnce(0)

		await getNewsletterStats()

		const activeCall = mockPrisma.newsletterSubscriber.count.mock.calls[1]
		expect(activeCall[0].where).toMatchObject({
			status: "CONFIRMED",
		})
	})

	it("should run both count queries concurrently via Promise.all", async () => {
		let resolveTotal!: (v: number) => void
		let resolveActive!: (v: number) => void

		mockPrisma.newsletterSubscriber.count
			.mockReturnValueOnce(new Promise<number>((resolve) => { resolveTotal = resolve }))
			.mockReturnValueOnce(new Promise<number>((resolve) => { resolveActive = resolve }))

		const promise = getNewsletterStats()

		// Both queries started before either resolved
		expect(mockPrisma.newsletterSubscriber.count).toHaveBeenCalledTimes(2)

		resolveTotal(200)
		resolveActive(150)

		const result = await promise
		expect(result.totalSubscribers).toBe(200)
		expect(result.activeSubscribers).toBe(150)
	})

	// -------------------------------------------------------------------------
	// Returns zeros on error
	// -------------------------------------------------------------------------

	it("should return zero stats when DB throws an error", async () => {
		mockPrisma.newsletterSubscriber.count.mockRejectedValue(new Error("DB error"))

		const result = await getNewsletterStats()

		expect(result).toEqual({
			totalSubscribers: 0,
			activeSubscribers: 0,
			inactiveSubscribers: 0,
		})
	})

	it("should not throw when DB throws; it returns safe zero values instead", async () => {
		mockPrisma.newsletterSubscriber.count.mockRejectedValue(new Error("Connection timeout"))

		await expect(getNewsletterStats()).resolves.not.toThrow()
	})
})
