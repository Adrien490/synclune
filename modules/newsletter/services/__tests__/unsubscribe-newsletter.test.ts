import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAjNewsletterUnsubscribe,
	mockHeaders,
	mockPrisma,
	mockValidateInput,
	mockUpdateTag,
	mockGetNewsletterInvalidationTags,
} = vi.hoisted(() => ({
	mockAjNewsletterUnsubscribe: { protect: vi.fn() },
	mockHeaders: vi.fn(),
	mockPrisma: {
		newsletterSubscriber: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
	mockValidateInput: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetNewsletterInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/arcjet", () => ({ ajNewsletterUnsubscribe: mockAjNewsletterUnsubscribe }))
vi.mock("next/headers", () => ({ headers: mockHeaders }))
vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}))
vi.mock("@/shared/lib/actions", () => ({ validateInput: mockValidateInput }))
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}))
vi.mock("../../constants/cache", () => ({
	getNewsletterInvalidationTags: mockGetNewsletterInvalidationTags,
}))
vi.mock("../../schemas/newsletter.schemas", () => ({
	unsubscribeTokenSchema: {},
}))
vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: {
		CONFIRMED: "CONFIRMED",
		PENDING: "PENDING",
		UNSUBSCRIBED: "UNSUBSCRIBED",
	},
}))

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { unsubscribeNewsletter } from "../unsubscribe-newsletter"

// ============================================================================
// HELPERS
// ============================================================================

const VALID_TOKEN = "550e8400-e29b-41d4-a716-446655440002"
const VALID_SUBSCRIBER_ID = "sub_cm9876543210fghij"
const VALID_USER_ID = "user_cm9876543210fghij"

function buildDecision(overrides: Record<string, unknown> = {}) {
	return {
		isDenied: () => false,
		reason: {
			isRateLimit: () => false,
			isShield: () => false,
		},
		...overrides,
	}
}

function buildDeniedDecision(type: "rateLimit" | "shield" | "other") {
	return {
		isDenied: () => true,
		reason: {
			isRateLimit: () => type === "rateLimit",
			isShield: () => type === "shield",
		},
	}
}

function createSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_SUBSCRIBER_ID,
		status: "CONFIRMED",
		userId: VALID_USER_ID,
		...overrides,
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe("unsubscribeNewsletter", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockHeaders.mockResolvedValue(new Headers({ "x-forwarded-for": "127.0.0.1" }))
		mockAjNewsletterUnsubscribe.protect.mockResolvedValue(buildDecision())
		mockValidateInput.mockReturnValue({ data: { token: VALID_TOKEN } })
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(createSubscriber())
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({})
		mockGetNewsletterInvalidationTags.mockReturnValue([
			"newsletter-subscribers-list",
			"admin-badges",
			`newsletter-user-${VALID_USER_ID}`,
		])
	})

	// -------------------------------------------------------------------------
	// Arcjet rate limit
	// -------------------------------------------------------------------------

	it("should return error when Arcjet rate limit is denied", async () => {
		mockAjNewsletterUnsubscribe.protect.mockResolvedValue(buildDeniedDecision("rateLimit"))

		const result = await unsubscribeNewsletter(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("Trop de tentatives")
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Arcjet shield
	// -------------------------------------------------------------------------

	it("should return error when Arcjet shield blocks the request", async () => {
		mockAjNewsletterUnsubscribe.protect.mockResolvedValue(buildDeniedDecision("shield"))

		const result = await unsubscribeNewsletter(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("bloquée")
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Arcjet generic denial
	// -------------------------------------------------------------------------

	it("should return generic error for other Arcjet denials", async () => {
		mockAjNewsletterUnsubscribe.protect.mockResolvedValue(buildDeniedDecision("other"))

		const result = await unsubscribeNewsletter(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("traitée")
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Token validation
	// -------------------------------------------------------------------------

	it("should return error when token validation fails", async () => {
		mockValidateInput.mockReturnValue({
			error: { message: "Token de désinscription invalide" },
		})

		const result = await unsubscribeNewsletter("not-a-valid-uuid")

		expect(result.success).toBe(false)
		expect(result.message).toBe("Token de désinscription invalide")
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Subscriber not found
	// -------------------------------------------------------------------------

	it("should return error when subscriber is not found", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null)

		const result = await unsubscribeNewsletter(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("invalide ou expiré")
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Already unsubscribed (idempotent)
	// -------------------------------------------------------------------------

	it("should return idempotent success when subscriber is already UNSUBSCRIBED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createSubscriber({ status: "UNSUBSCRIBED" })
		)

		const result = await unsubscribeNewsletter(VALID_TOKEN)

		expect(result.success).toBe(true)
		expect(result.message).toContain("déjà désinscrit")
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Successful unsubscribe
	// -------------------------------------------------------------------------

	it("should update subscriber status to UNSUBSCRIBED on success", async () => {
		const result = await unsubscribeNewsletter(VALID_TOKEN)

		expect(result.success).toBe(true)
		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_SUBSCRIBER_ID },
				data: expect.objectContaining({
					status: "UNSUBSCRIBED",
				}),
			})
		)
	})

	it("should set unsubscribedAt to current date on success", async () => {
		const before = new Date()

		await unsubscribeNewsletter(VALID_TOKEN)

		const after = new Date()
		const updateCall = mockPrisma.newsletterSubscriber.update.mock.calls[0][0]
		expect(updateCall.data.unsubscribedAt).toBeInstanceOf(Date)
		expect(updateCall.data.unsubscribedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
		expect(updateCall.data.unsubscribedAt.getTime()).toBeLessThanOrEqual(after.getTime())
	})

	// -------------------------------------------------------------------------
	// Cache invalidation
	// -------------------------------------------------------------------------

	it("should invalidate newsletter cache tags with userId after unsubscribe", async () => {
		await unsubscribeNewsletter(VALID_TOKEN)

		expect(mockGetNewsletterInvalidationTags).toHaveBeenCalledWith(VALID_USER_ID)
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list")
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges")
		expect(mockUpdateTag).toHaveBeenCalledWith(`newsletter-user-${VALID_USER_ID}`)
	})

	it("should invalidate cache without userId tag when subscriber has no userId", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createSubscriber({ userId: null })
		)
		mockGetNewsletterInvalidationTags.mockReturnValue([
			"newsletter-subscribers-list",
			"admin-badges",
		])

		await unsubscribeNewsletter(VALID_TOKEN)

		expect(mockGetNewsletterInvalidationTags).toHaveBeenCalledWith(undefined)
		expect(mockUpdateTag).toHaveBeenCalledTimes(2)
	})

	// -------------------------------------------------------------------------
	// Unexpected error → generic error message
	// -------------------------------------------------------------------------

	it("should return generic error on unexpected exception", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB crash"))

		const result = await unsubscribeNewsletter(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("erreur")
	})

	it("should return generic error when Arcjet protect throws", async () => {
		mockAjNewsletterUnsubscribe.protect.mockRejectedValue(new Error("Arcjet network failure"))

		const result = await unsubscribeNewsletter(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("erreur")
	})

	// -------------------------------------------------------------------------
	// Query filters
	// -------------------------------------------------------------------------

	it("should query subscriber by unsubscribeToken excluding soft-deleted records", async () => {
		await unsubscribeNewsletter(VALID_TOKEN)

		expect(mockPrisma.newsletterSubscriber.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					unsubscribeToken: VALID_TOKEN,
					deletedAt: null,
				}),
			})
		)
	})
})
