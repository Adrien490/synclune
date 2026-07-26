import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSuccess,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { update: vi.fn() },
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAuth: mockRequireAuth,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	USER_LIMITS: { UPDATE_PROFILE: "user-update-profile" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));
vi.mock("../../constants/cache", () => ({
	USERS_CACHE_TAGS: { CURRENT_USER: (id: string) => `user-${id}` },
}));

import { acceptTerms } from "../accept-terms";
import { LEGAL_TERMS_VERSION } from "@/shared/constants/legal-versions";

// ============================================================================
// TESTS — RGPD-AUDIT P1-3 (consentement OAuth, accountability Art. 7)
// ============================================================================

describe("acceptTerms", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAuth.mockResolvedValue({
			user: { id: VALID_USER_ID, email: "user@example.com", name: "User" },
		});
		mockPrisma.user.update.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("records termsAcceptedAt AND the current terms version (Art. 7 accountability)", async () => {
		const result = await acceptTerms(undefined);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.user.update).toHaveBeenCalledWith({
			where: { id: VALID_USER_ID },
			data: {
				termsAcceptedAt: expect.any(Date),
				termsVersion: LEGAL_TERMS_VERSION,
			},
		});
	});

	it("invalidates the current-user cache tag after acceptance", async () => {
		await acceptTerms(undefined);

		expect(mockUpdateTag).toHaveBeenCalledWith(`user-${VALID_USER_ID}`);
	});

	it("returns the auth error without touching the DB when unauthenticated", async () => {
		const authError = { error: { status: ActionStatus.UNAUTHORIZED, message: "non connecté" } };
		mockRequireAuth.mockResolvedValue(authError);

		const result = await acceptTerms(undefined);

		expect(result).toBe(authError.error);
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("returns the rate-limit error without touching the DB when limited", async () => {
		const rateError = { error: { status: ActionStatus.ERROR, message: "trop de requêtes" } };
		mockEnforceRateLimit.mockResolvedValue(rateError);

		const result = await acceptTerms(undefined);

		expect(result).toBe(rateError.error);
		expect(mockPrisma.user.update).not.toHaveBeenCalled();
	});

	it("handles DB failure via handleActionError", async () => {
		mockPrisma.user.update.mockRejectedValue(new Error("db down"));

		const result = await acceptTerms(undefined);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalledTimes(1);
	});
});
