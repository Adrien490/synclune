import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockSuccess,
	mockHandleActionError,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockHandleActionError: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("@/shared/lib/actions", () => ({
	success: mockSuccess,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_NEWSLETTER_LIMITS: { REFRESH: "admin-newsletter-refresh" },
}));
vi.mock("../../constants/cache", () => ({
	NEWSLETTER_CACHE_TAGS: { LIST: "newsletter-subscribers-list" },
}));
vi.mock("@/shared/constants/cache-tags", () => ({
	SHARED_CACHE_TAGS: { ADMIN_BADGES: "admin-badges" },
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { refreshNewsletter } from "../refresh-newsletter";

// ============================================================================
// HELPERS
// ============================================================================

const ADMIN_ID = "admin_cm1234567890abcde";

function createAdminUser(overrides: Record<string, unknown> = {}) {
	return {
		user: {
			id: ADMIN_ID,
			name: "Admin Test",
			role: "ADMIN",
			...overrides,
		},
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("refreshNewsletter", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue(createAdminUser());
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	// -------------------------------------------------------------------------
	// Auth
	// -------------------------------------------------------------------------

	it("should return auth error when not an admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdminWithUser.mockResolvedValue({ error: authError });

		const result = await refreshNewsletter(undefined, new FormData());

		expect(result).toEqual(authError);
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Rate limit
	// -------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await refreshNewsletter(undefined, new FormData());

		expect(result).toEqual(rateLimitError);
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should pass the REFRESH limit key to enforceRateLimitForCurrentUser", async () => {
		await refreshNewsletter(undefined, new FormData());

		expect(mockEnforceRateLimit).toHaveBeenCalledWith("admin-newsletter-refresh");
	});

	// -------------------------------------------------------------------------
	// Cache invalidation
	// -------------------------------------------------------------------------

	it("should invalidate the newsletter list cache tag", async () => {
		await refreshNewsletter(undefined, new FormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
	});

	it("should invalidate the admin badges cache tag", async () => {
		await refreshNewsletter(undefined, new FormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should invalidate both cache tags on success", async () => {
		await refreshNewsletter(undefined, new FormData());

		expect(mockUpdateTag).toHaveBeenCalledTimes(2);
		expect(mockUpdateTag).toHaveBeenCalledWith("newsletter-subscribers-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	// -------------------------------------------------------------------------
	// Success
	// -------------------------------------------------------------------------

	it("should return success with correct message", async () => {
		const result = await refreshNewsletter(undefined, new FormData());

		expect(mockSuccess).toHaveBeenCalledWith("Newsletter rafraîchie");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// -------------------------------------------------------------------------
	// Unexpected error → handleActionError
	// -------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockRequireAdminWithUser.mockRejectedValue(new Error("Auth service crash"));

		const result = await refreshNewsletter(undefined, new FormData());

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Une erreur est survenue lors du rafraîchissement",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should call handleActionError when updateTag throws", async () => {
		mockUpdateTag.mockImplementation(() => {
			throw new Error("Cache error");
		});

		const result = await refreshNewsletter(undefined, new FormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
