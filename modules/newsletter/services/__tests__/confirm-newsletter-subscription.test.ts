import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAjNewsletterConfirm,
	mockHeaders,
	mockGetClientIp,
	mockPrisma,
	mockValidateInput,
	mockUpdateTag,
	mockSendNewsletterWelcomeEmail,
	mockGetNewsletterInvalidationTags,
} = vi.hoisted(() => ({
	mockAjNewsletterConfirm: { protect: vi.fn() },
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockPrisma: {
		newsletterSubscriber: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
	mockValidateInput: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSendNewsletterWelcomeEmail: vi.fn(),
	mockGetNewsletterInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/arcjet", () => ({ ajNewsletterConfirm: mockAjNewsletterConfirm }))
vi.mock("next/headers", () => ({ headers: mockHeaders }))
vi.mock("@/shared/lib/rate-limit", () => ({ getClientIp: mockGetClientIp }))
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
vi.mock("@/modules/emails/services/newsletter-emails", () => ({
	sendNewsletterWelcomeEmail: mockSendNewsletterWelcomeEmail,
}))
vi.mock("../../constants/cache", () => ({
	getNewsletterInvalidationTags: mockGetNewsletterInvalidationTags,
}))
vi.mock("../../schemas/newsletter.schemas", () => ({
	confirmationTokenSchema: {},
}))
vi.mock("../../constants/urls.constants", () => ({
	NEWSLETTER_BASE_URL: "https://synclune.fr",
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

import { confirmNewsletterSubscription } from "../confirm-newsletter-subscription"

// ============================================================================
// HELPERS
// ============================================================================

const VALID_TOKEN = "550e8400-e29b-41d4-a716-446655440000"
const VALID_SUBSCRIBER_ID = "sub_cm1234567890abcde"
const VALID_USER_ID = "user_cm1234567890abcde"

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
		email: "user@example.com",
		status: "PENDING",
		confirmationSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
		unsubscribeToken: "unsub-550e8400-e29b-41d4-a716-446655440001",
		userId: VALID_USER_ID,
		...overrides,
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe("confirmNewsletterSubscription", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockHeaders.mockResolvedValue(new Headers({ "x-forwarded-for": "127.0.0.1" }))
		mockGetClientIp.mockResolvedValue("127.0.0.1")
		mockAjNewsletterConfirm.protect.mockResolvedValue(buildDecision())
		mockValidateInput.mockReturnValue({ data: { token: VALID_TOKEN } })
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(createSubscriber())
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({})
		mockGetNewsletterInvalidationTags.mockReturnValue([
			"newsletter-subscribers-list",
			"admin-badges",
			`newsletter-user-${VALID_USER_ID}`,
		])
		mockSendNewsletterWelcomeEmail.mockResolvedValue(undefined)
	})

	// -------------------------------------------------------------------------
	// Arcjet rate limit
	// -------------------------------------------------------------------------

	it("should return error when Arcjet rate limit is denied", async () => {
		mockAjNewsletterConfirm.protect.mockResolvedValue(buildDeniedDecision("rateLimit"))

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("Trop de tentatives")
	})

	// -------------------------------------------------------------------------
	// Arcjet shield
	// -------------------------------------------------------------------------

	it("should return error when Arcjet shield blocks the request", async () => {
		mockAjNewsletterConfirm.protect.mockResolvedValue(buildDeniedDecision("shield"))

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("bloquée")
	})

	// -------------------------------------------------------------------------
	// Arcjet generic denial
	// -------------------------------------------------------------------------

	it("should return generic error for other Arcjet denials", async () => {
		mockAjNewsletterConfirm.protect.mockResolvedValue(buildDeniedDecision("other"))

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("traitée")
	})

	// -------------------------------------------------------------------------
	// Token validation
	// -------------------------------------------------------------------------

	it("should return error when token validation fails", async () => {
		mockValidateInput.mockReturnValue({
			error: { message: "Token de confirmation invalide" },
		})

		const result = await confirmNewsletterSubscription("not-a-valid-uuid")

		expect(result.success).toBe(false)
		expect(result.message).toBe("Token de confirmation invalide")
		expect(mockPrisma.newsletterSubscriber.findFirst).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Subscriber not found
	// -------------------------------------------------------------------------

	it("should return error when subscriber is not found", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null)

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("invalide ou expiré")
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Already confirmed (idempotent)
	// -------------------------------------------------------------------------

	it("should return idempotent success when subscriber is already CONFIRMED", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createSubscriber({ status: "CONFIRMED" })
		)

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(true)
		expect(result.message).toContain("déjà confirmé")
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// No confirmationSentAt
	// -------------------------------------------------------------------------

	it("should return error when confirmationSentAt is null", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createSubscriber({ confirmationSentAt: null })
		)

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("invalide")
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Token expired (> 7 days)
	// -------------------------------------------------------------------------

	it("should return error when token is older than 7 days", async () => {
		const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createSubscriber({ confirmationSentAt: eightDaysAgo })
		)

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("expiré")
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Token valid (< 7 days) → success, updates DB
	// -------------------------------------------------------------------------

	it("should update subscriber to CONFIRMED when token is valid and within 7 days", async () => {
		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(true)
		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_SUBSCRIBER_ID },
				data: expect.objectContaining({
					status: "CONFIRMED",
					confirmationToken: null,
					unsubscribedAt: null,
				}),
			})
		)
	})

	it("should set confirmedAt and subscribedAt to current date on confirmation", async () => {
		const before = new Date()

		await confirmNewsletterSubscription(VALID_TOKEN)

		const after = new Date()
		const updateCall = mockPrisma.newsletterSubscriber.update.mock.calls[0][0]
		expect(updateCall.data.confirmedAt).toBeInstanceOf(Date)
		expect(updateCall.data.confirmedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
		expect(updateCall.data.confirmedAt.getTime()).toBeLessThanOrEqual(after.getTime())
	})

	// -------------------------------------------------------------------------
	// Gets client IP for GDPR traceability
	// -------------------------------------------------------------------------

	it("should store client IP address for GDPR traceability", async () => {
		mockGetClientIp.mockResolvedValue("192.168.1.42")

		await confirmNewsletterSubscription(VALID_TOKEN)

		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					confirmationIpAddress: "192.168.1.42",
				}),
			})
		)
	})

	it("should store 'unknown' as IP when getClientIp returns null", async () => {
		mockGetClientIp.mockResolvedValue(null)

		await confirmNewsletterSubscription(VALID_TOKEN)

		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					confirmationIpAddress: "unknown",
				}),
			})
		)
	})

	// -------------------------------------------------------------------------
	// Cache invalidation
	// -------------------------------------------------------------------------

	it("should invalidate newsletter cache tags after confirmation", async () => {
		await confirmNewsletterSubscription(VALID_TOKEN)

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

		await confirmNewsletterSubscription(VALID_TOKEN)

		expect(mockGetNewsletterInvalidationTags).toHaveBeenCalledWith(undefined)
	})

	// -------------------------------------------------------------------------
	// Welcome email sent
	// -------------------------------------------------------------------------

	it("should send welcome email with unsubscribe URL after successful confirmation", async () => {
		await confirmNewsletterSubscription(VALID_TOKEN)

		expect(mockSendNewsletterWelcomeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "user@example.com",
				unsubscribeUrl: expect.stringContaining("unsub-550e8400-e29b-41d4-a716-446655440001"),
			})
		)
	})

	// -------------------------------------------------------------------------
	// Email failure does not break confirmation (resilience)
	// -------------------------------------------------------------------------

	it("should still return success when welcome email send fails", async () => {
		mockSendNewsletterWelcomeEmail.mockRejectedValue(new Error("SMTP error"))

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(true)
		expect(result.message).toContain("confirmée")
		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalled()
	})

	// -------------------------------------------------------------------------
	// Unexpected error → generic error message
	// -------------------------------------------------------------------------

	it("should return generic error on unexpected exception", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB crash"))

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("erreur")
	})

	it("should return generic error when Arcjet protect throws", async () => {
		mockAjNewsletterConfirm.protect.mockRejectedValue(new Error("Arcjet network failure"))

		const result = await confirmNewsletterSubscription(VALID_TOKEN)

		expect(result.success).toBe(false)
		expect(result.message).toContain("erreur")
	})
})
