import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockUpdateTag, mockSendConfirmationEmail, mockGetNewsletterInvalidationTags } =
	vi.hoisted(() => ({
		mockPrisma: {
			newsletterSubscriber: {
				findFirst: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
			},
		},
		mockUpdateTag: vi.fn(),
		mockSendConfirmationEmail: vi.fn(),
		mockGetNewsletterInvalidationTags: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/modules/emails/services/newsletter-emails", () => ({
	sendNewsletterConfirmationEmail: mockSendConfirmationEmail,
}));
vi.mock("../../constants/cache", () => ({
	getNewsletterInvalidationTags: mockGetNewsletterInvalidationTags,
}));
vi.mock("../../constants/urls.constants", () => ({
	NEWSLETTER_BASE_URL: "http://localhost:3000",
}));
vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: {
		CONFIRMED: "CONFIRMED",
		PENDING: "PENDING",
		UNSUBSCRIBED: "UNSUBSCRIBED",
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { subscribeToNewsletterInternal } from "../subscribe-to-newsletter-internal";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Regex matching the UUID v4 format produced by randomUUID() */
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_PARAMS = {
	email: "user@example.com",
	ipAddress: "127.0.0.1",
	userAgent: "Mozilla/5.0",
	consentSource: "newsletter_form" as const,
};

// ============================================================================
// HELPERS
// ============================================================================

function createExistingSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		id: "sub_cm1234567890abcde",
		email: "user@example.com",
		status: "CONFIRMED",
		userId: null,
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("subscribeToNewsletterInternal", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockGetNewsletterInvalidationTags.mockReturnValue([
			"newsletter-subscribers-list",
			"admin-badges",
		]);
		mockSendConfirmationEmail.mockResolvedValue({ success: true });
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);
		mockPrisma.newsletterSubscriber.create.mockResolvedValue({});
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});
	});

	it("should return alreadySubscribed=true for an existing CONFIRMED subscriber without sending email", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createExistingSubscriber({ status: "CONFIRMED" }),
		);

		const result = await subscribeToNewsletterInternal(DEFAULT_PARAMS);

		expect(result.success).toBe(true);
		expect(result.alreadySubscribed).toBe(true);
		expect(result.message).toBe(
			"Si cette adresse n'est pas encore inscrite, un email de confirmation vous a été envoyé.",
		);
		expect(mockSendConfirmationEmail).not.toHaveBeenCalled();
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("should regenerate token and resend confirmation email for PENDING subscriber", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createExistingSubscriber({ status: "PENDING" }),
		);

		const result = await subscribeToNewsletterInternal(DEFAULT_PARAMS);

		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { email: "user@example.com" },
				data: expect.objectContaining({
					confirmationToken: expect.stringMatching(UUID_V4_PATTERN),
					confirmationSentAt: expect.any(Date),
				}),
			}),
		);
		// The token used in the DB update and the email URL must be the same
		const updateCall = mockPrisma.newsletterSubscriber.update.mock.calls[0]![0];
		const tokenInDb = updateCall.data.confirmationToken;
		expect(mockSendConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "user@example.com",
				confirmationUrl: expect.stringContaining(tokenInDb),
			}),
		);
		expect(result.success).toBe(true);
		expect(result.alreadySubscribed).toBeUndefined();
		// Same generic message as CONFIRMED to prevent email enumeration
		expect(result.message).toBe(
			"Si cette adresse n'est pas encore inscrite, un email de confirmation vous a été envoyé.",
		);
	});

	it("should invalidate cache for PENDING subscriber re-confirmation", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createExistingSubscriber({ status: "PENDING", userId: "user_abc" }),
		);

		await subscribeToNewsletterInternal(DEFAULT_PARAMS);

		expect(mockGetNewsletterInvalidationTags).toHaveBeenCalledWith("user_abc");
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should update UNSUBSCRIBED subscriber to PENDING and send confirmation email", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createExistingSubscriber({ status: "UNSUBSCRIBED" }),
		);

		const result = await subscribeToNewsletterInternal(DEFAULT_PARAMS);

		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { email: "user@example.com" },
				data: expect.objectContaining({
					confirmationToken: expect.stringMatching(UUID_V4_PATTERN),
					status: "PENDING",
					confirmationSentAt: expect.any(Date),
					unsubscribeToken: expect.stringMatching(UUID_V4_PATTERN),
				}),
			}),
		);
		expect(mockSendConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "user@example.com",
				confirmationUrl: expect.stringMatching(/\/newsletter\/confirm\?token=/),
			}),
		);
		expect(result.success).toBe(true);
		expect(result.message).toContain("Bienvenue à nouveau");
	});

	it("should create a new subscriber with all RGPD fields", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		await subscribeToNewsletterInternal({
			email: "newuser@example.com",
			ipAddress: "192.168.1.1",
			userAgent: "Chrome/120",
			consentSource: "newsletter_form",
		});

		expect(mockPrisma.newsletterSubscriber.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					email: "newuser@example.com",
					ipAddress: "192.168.1.1",
					userAgent: "Chrome/120",
					consentSource: "newsletter_form",
					consentTimestamp: expect.any(Date),
					confirmationToken: expect.stringMatching(UUID_V4_PATTERN),
					confirmationSentAt: expect.any(Date),
					status: "PENDING",
				}),
			}),
		);
	});

	it("should send confirmation email with URL containing the base URL and token for a new subscriber", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		await subscribeToNewsletterInternal(DEFAULT_PARAMS);

		expect(mockSendConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "user@example.com",
				confirmationUrl: expect.stringMatching(
					/http:\/\/localhost:3000\/newsletter\/confirm\?token=/,
				),
			}),
		);
		const callArgs = mockSendConfirmationEmail.mock.calls[0]![0] as { confirmationUrl: string };
		const tokenInUrl = new URL(callArgs.confirmationUrl).searchParams.get("token");
		expect(tokenInUrl).toMatch(UUID_V4_PATTERN);
	});

	it("should invalidate cache after creating a new subscriber", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		await subscribeToNewsletterInternal(DEFAULT_PARAMS);

		expect(mockGetNewsletterInvalidationTags).toHaveBeenCalledWith();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should return success message for new subscriber", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		const result = await subscribeToNewsletterInternal(DEFAULT_PARAMS);

		expect(result.success).toBe(true);
		expect(result.message).toContain("Merci");
		expect(result.alreadySubscribed).toBeUndefined();
	});

	it("should return success=false with error message when an exception is thrown", async () => {
		mockPrisma.newsletterSubscriber.findFirst.mockRejectedValue(new Error("DB connection failed"));

		const result = await subscribeToNewsletterInternal(DEFAULT_PARAMS);

		expect(result.success).toBe(false);
		expect(result.message).toContain("erreur");
	});
});
