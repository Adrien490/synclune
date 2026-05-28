import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAuth,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockEnforceRateLimit,
	mockCheckRateLimit,
} = vi.hoisted(() => ({
	mockAuth: {
		api: {
			requestPasswordReset: vi.fn(),
		},
	},
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	AUTH_LIMITS: { PASSWORD_RESET: { limit: 3, windowMs: 3600000 } },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../schemas/auth.schemas", () => ({ requestPasswordResetSchema: {} }));

import { requestPasswordReset } from "../request-password-reset";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	email: "user@example.com",
});

const validatedData = {
	email: "user@example.com",
};

// ============================================================================
// TESTS
// ============================================================================

describe("requestPasswordReset", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 2, limit: 3, reset: 0 });
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockAuth.api.requestPasswordReset.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
	});

	it("should return validation error for invalid data", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Email invalide" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await requestPasswordReset(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should succeed with valid email", async () => {
		const result = await requestPasswordReset(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("réinitialisation");
	});

	it("should call auth.api.requestPasswordReset with correct body", async () => {
		await requestPasswordReset(undefined, validFormData);
		expect(mockAuth.api.requestPasswordReset).toHaveBeenCalledWith({
			body: { email: "user@example.com", redirectTo: "/reinitialiser-mot-de-passe" },
		});
	});

	it("should still return success even when auth API throws (anti-enumeration)", async () => {
		mockAuth.api.requestPasswordReset.mockRejectedValue(new Error("User not found"));
		const result = await requestPasswordReset(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("réinitialisation");
	});

	it("should return the same message whether or not auth API throws (anti-enumeration)", async () => {
		const successResult = await requestPasswordReset(undefined, validFormData);

		mockAuth.api.requestPasswordReset.mockRejectedValue(new Error("Email not found"));
		const failureResult = await requestPasswordReset(undefined, validFormData);

		expect(successResult.status).toBe(ActionStatus.SUCCESS);
		expect(failureResult.status).toBe(ActionStatus.SUCCESS);
		expect(successResult.message).toBe(failureResult.message);
	});

	/**
	 * @regression AUTH-ADMIN-009 — `requestPasswordReset` must rate-limit by EMAIL
	 * target (3/h) in addition to per-IP. Otherwise an attacker rotating IPs
	 * (Tor/botnet) can mail-bomb a single victim's inbox.
	 */
	it("(AUTH-ADMIN-009) per-email rate-limit silently swallows further requests", async () => {
		// Per-IP limit ok, but per-email limit exhausted
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 3,
			reset: 0,
			retryAfter: 3600,
			error: "Too many",
		});

		const result = await requestPasswordReset(undefined, validFormData);

		// Generic success message — no leak to the attacker
		expect(result.status).toBe(ActionStatus.SUCCESS);
		// Better Auth API must NOT be called → no email is sent to the victim
		expect(mockAuth.api.requestPasswordReset).not.toHaveBeenCalled();
	});

	it("(AUTH-ADMIN-009) per-email rate-limit uses normalized email as identifier", async () => {
		mockValidateInput.mockReturnValue({ data: { email: "Victim@Example.COM" } });

		await requestPasswordReset(undefined, validFormData);

		expect(mockCheckRateLimit).toHaveBeenCalledWith(
			"password-reset-email:victim@example.com",
			expect.objectContaining({ limit: 3 }),
		);
	});
});
