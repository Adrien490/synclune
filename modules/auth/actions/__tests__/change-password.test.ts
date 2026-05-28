import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAuth,
	mockHeaders,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockPrisma,
	mockValidateInput,
	mockSuccess,
	mockError,
} = vi.hoisted(() => ({
	mockAuth: { api: { changePassword: vi.fn() } },
	mockHeaders: vi.fn(),
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockPrisma: { user: { findUnique: vi.fn() } },
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	AUTH_LIMITS: { PASSWORD_CHANGE: { limit: 3, windowMs: 3600000 } },
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../schemas/auth.schemas", () => ({ changePasswordSchema: {} }));
vi.mock("../../services/hibp.service", () => ({
	checkPasswordBreached: vi.fn().mockResolvedValue(0),
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/shared/constants/cache-tags", () => ({
	SESSION_CACHE_TAGS: { SESSION: (id: string) => `session-${id}` },
}));

import { changePassword } from "../change-password";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	currentPassword: "OldP@ss123",
	newPassword: "NewP@ss456",
	confirmPassword: "NewP@ss456",
});

const validatedData = {
	currentPassword: "OldP@ss123",
	newPassword: "NewP@ss456",
};

// ============================================================================
// TESTS
// ============================================================================

describe("changePassword", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockHeaders.mockResolvedValue(new Headers());
		mockRequireAuth.mockResolvedValue({
			user: { id: VALID_USER_ID, email: "user@example.com", name: "User" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockPrisma.user.findUnique.mockResolvedValue({
			emailVerified: true,
			accounts: [{ providerId: "credential" }],
		});
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockAuth.api.changePassword.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
	});

	it("should return auth error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await changePassword(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return error when user not found in DB", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);
		const result = await changePassword(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("introuvable");
	});

	it("should return error when email not verified", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({
			emailVerified: false,
			accounts: [{ providerId: "credential" }],
		});
		const result = await changePassword(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("email");
	});

	it("should return error for OAuth-only account", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({
			emailVerified: true,
			accounts: [{ providerId: "google" }],
		});
		const result = await changePassword(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Google");
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await changePassword(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should succeed with valid current password", async () => {
		const result = await changePassword(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockAuth.api.changePassword).toHaveBeenCalled();
	});

	it("should return error for incorrect current password", async () => {
		mockAuth.api.changePassword.mockRejectedValue(new Error("Invalid password"));
		const result = await changePassword(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("incorrect");
	});

	it("should handle unexpected error gracefully", async () => {
		mockHeaders.mockRejectedValue(new Error("Fatal"));
		const result = await changePassword(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	/**
	 * @regression AUTH-ADMIN-005 — `changePassword` must be rate-limited.
	 * Otherwise an attacker with a stolen active session can brute-force the
	 * `currentPassword` via Better Auth `/change-password` (~100 req/min global cap only).
	 */
	it("(AUTH-ADMIN-005) returns rate-limit error when bucket is exhausted", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: {
				status: ActionStatus.ERROR,
				message: "Trop de requêtes. Veuillez réessayer plus tard.",
			},
		});

		const result = await changePassword(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Trop de requêtes");
		// Make sure the rate-limit short-circuits BEFORE Better Auth is called
		expect(mockAuth.api.changePassword).not.toHaveBeenCalled();
	});

	it("(AUTH-ADMIN-005) enforces rate-limit AFTER auth (preserves 401 vs 429 ordering)", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No session" },
		});

		await changePassword(undefined, validFormData);

		// If auth fails first, we don't consume a rate-limit bucket
		expect(mockEnforceRateLimit).not.toHaveBeenCalled();
	});
});
