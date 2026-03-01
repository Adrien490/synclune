import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockHeaders,
	mockGetClientIp,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockSubscribeToNewsletterInternal,
	mockGetNewsletterInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		newsletterSubscriber: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSubscribeToNewsletterInternal: vi.fn(),
	mockGetNewsletterInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/shared/lib/rate-limit", () => ({ getClientIp: mockGetClientIp }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../services/subscribe-to-newsletter-internal", () => ({
	subscribeToNewsletterInternal: mockSubscribeToNewsletterInternal,
}));
vi.mock("../../constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: {
		LIST: "newsletter-subscribers-list",
		USER_STATUS: (userId: string) => `newsletter-user-${userId}`,
	},
}));
vi.mock("../../utils/cache.utils", () => ({
	getNewsletterInvalidationTags: mockGetNewsletterInvalidationTags,
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

import { toggleNewsletter } from "../toggle-newsletter";

// ============================================================================
// HELPERS
// ============================================================================

function createAuthenticatedUser(overrides: Record<string, unknown> = {}) {
	return {
		user: {
			id: VALID_USER_ID,
			email: "user@example.com",
			name: "Test User",
			role: "USER",
			...overrides,
		},
	};
}

function createSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		id: "sub_cm1234567890abcde",
		email: "user@example.com",
		status: "CONFIRMED",
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("toggleNewsletter", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue(createAuthenticatedUser());
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockHeaders.mockResolvedValue(new Headers({ "user-agent": "Mozilla/5.0" }));
		mockGetClientIp.mockResolvedValue("127.0.0.1");
		mockValidateInput.mockReturnValue({ data: { action: "subscribe" } });
		mockGetNewsletterInvalidationTags.mockReturnValue([
			"newsletter-subscribers-list",
			"admin-badges",
		]);
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	it("should return unauthorized when user is not logged in", async () => {
		const unauthorizedError = {
			status: ActionStatus.UNAUTHORIZED,
			message: "Vous devez être connecté.",
		};
		mockRequireAuth.mockResolvedValue({ error: unauthorizedError });

		const result = await toggleNewsletter(undefined, createMockFormData({ action: "subscribe" }));

		expect(result).toEqual(unauthorizedError);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
	});

	it("should return error when rate limit is exceeded", async () => {
		const rateLimitError = {
			status: ActionStatus.ERROR,
			message: "Trop de requêtes. Réessayez plus tard.",
		};
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await toggleNewsletter(undefined, createMockFormData({ action: "subscribe" }));

		expect(result).toEqual(rateLimitError);
		expect(mockValidateInput).not.toHaveBeenCalled();
	});

	it("should return validation error when action value is invalid", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Action invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await toggleNewsletter(
			undefined,
			createMockFormData({ action: "invalid_action" }),
		);

		expect(result).toEqual(validationError);
		expect(mockSubscribeToNewsletterInternal).not.toHaveBeenCalled();
	});

	it("should call subscribeToNewsletterInternal with user email, ip and userAgent on subscribe", async () => {
		mockHeaders.mockResolvedValue(new Headers({ "user-agent": "TestAgent/2.0" }));
		mockGetClientIp.mockResolvedValue("10.0.0.1");
		mockValidateInput.mockReturnValue({ data: { action: "subscribe" } });
		mockSubscribeToNewsletterInternal.mockResolvedValue({
			success: true,
			message: "Email de confirmation envoyé.",
		});

		await toggleNewsletter(undefined, createMockFormData({ action: "subscribe" }));

		expect(mockSubscribeToNewsletterInternal).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "user@example.com",
				consentSource: "account_settings",
			}),
		);
	});

	it("should return error when subscribe internal call fails", async () => {
		mockValidateInput.mockReturnValue({ data: { action: "subscribe" } });
		mockSubscribeToNewsletterInternal.mockResolvedValue({
			success: false,
			message: "Erreur interne lors de l'inscription.",
		});

		const result = await toggleNewsletter(undefined, createMockFormData({ action: "subscribe" }));

		expect(mockError).toHaveBeenCalledWith("Erreur interne lors de l'inscription.");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should invalidate cache and return success on subscribe", async () => {
		mockValidateInput.mockReturnValue({ data: { action: "subscribe" } });
		mockSubscribeToNewsletterInternal.mockResolvedValue({
			success: true,
			message: "Email de confirmation envoyé.",
		});

		const result = await toggleNewsletter(undefined, createMockFormData({ action: "subscribe" }));

		expect(mockUpdateTag).toHaveBeenCalled();
		expect(mockSuccess).toHaveBeenCalledWith("Email de confirmation envoyé.");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return success message when subscriber is not found on unsubscribe", async () => {
		mockValidateInput.mockReturnValue({ data: { action: "unsubscribe" } });
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(null);

		const result = await toggleNewsletter(undefined, createMockFormData({ action: "unsubscribe" }));

		expect(mockSuccess).toHaveBeenCalledWith("Vous n'êtes pas inscrit(e) à la newsletter.");
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("should return success message when subscriber is already UNSUBSCRIBED", async () => {
		mockValidateInput.mockReturnValue({ data: { action: "unsubscribe" } });
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createSubscriber({ status: "UNSUBSCRIBED" }),
		);

		const result = await toggleNewsletter(undefined, createMockFormData({ action: "unsubscribe" }));

		expect(mockSuccess).toHaveBeenCalledWith("Vous n'êtes pas inscrit(e) à la newsletter.");
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
	});

	it("should update subscriber to UNSUBSCRIBED and set unsubscribedAt when found", async () => {
		mockValidateInput.mockReturnValue({ data: { action: "unsubscribe" } });
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createSubscriber({ id: "sub_abc", status: "CONFIRMED" }),
		);
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});

		await toggleNewsletter(undefined, createMockFormData({ action: "unsubscribe" }));

		expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sub_abc" },
				data: expect.objectContaining({
					status: "UNSUBSCRIBED",
					unsubscribedAt: expect.any(Date),
				}),
			}),
		);
	});

	it("should invalidate cache after unsubscribe", async () => {
		mockValidateInput.mockReturnValue({ data: { action: "unsubscribe" } });
		mockPrisma.newsletterSubscriber.findFirst.mockResolvedValue(
			createSubscriber({ status: "CONFIRMED" }),
		);
		mockPrisma.newsletterSubscriber.update.mockResolvedValue({});

		const result = await toggleNewsletter(undefined, createMockFormData({ action: "unsubscribe" }));

		expect(mockUpdateTag).toHaveBeenCalled();
		expect(mockSuccess).toHaveBeenCalledWith("Vous avez été désinscrit(e) de la newsletter.");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError when an unexpected exception is thrown", async () => {
		mockValidateInput.mockReturnValue({ data: { action: "subscribe" } });
		mockSubscribeToNewsletterInternal.mockRejectedValue(new Error("Unexpected DB error"));

		const result = await toggleNewsletter(undefined, createMockFormData({ action: "subscribe" }));

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
