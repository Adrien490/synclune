import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAuth,
	mockHeaders,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockUnauthorized,
	mockHandleActionError,
	mockPrismaUserUpdate,
	mockEnforceRateLimit,
} = vi.hoisted(() => ({
	mockAuth: {
		api: {
			getSession: vi.fn(),
			signUpEmail: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockUnauthorized: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockPrismaUserUpdate: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	AUTH_LIMITS: { SIGNUP: "auth-signup" },
}));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	unauthorized: mockUnauthorized,
	handleActionError: mockHandleActionError,
}));
vi.mock("../schemas/auth.schemas", () => ({ signUpEmailSchema: {} }));
vi.mock("@/shared/lib/prisma", () => ({
	prisma: { user: { update: mockPrismaUserUpdate } },
}));
vi.mock("../../services/hibp.service", () => ({
	checkPasswordBreached: vi.fn().mockResolvedValue(0),
}));

import { signUpEmail } from "../sign-up-email";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	email: "new@example.com",
	password: "SecureP@ss123",
	name: "Marie Dupont",
});

const validatedData = {
	email: "new@example.com",
	password: "SecureP@ss123",
	name: "Marie Dupont",
};

// ============================================================================
// TESTS
// ============================================================================

describe("signUpEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockHeaders.mockResolvedValue(new Headers());
		mockAuth.api.getSession.mockResolvedValue(null);
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockAuth.api.signUpEmail.mockResolvedValue({ user: { id: "user-1" } });

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockUnauthorized.mockImplementation((msg: string) => ({
			status: ActionStatus.UNAUTHORIZED,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
		mockPrismaUserUpdate.mockResolvedValue({});
	});

	it("should return unauthorized when already logged in", async () => {
		mockAuth.api.getSession.mockResolvedValue({ user: { id: "user-1" } });
		const result = await signUpEmail(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return validation error for invalid data", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Email invalide" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await signUpEmail(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should succeed with valid data", async () => {
		const result = await signUpEmail(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("vérification");
	});

	it("should call auth.api.signUpEmail with correct body", async () => {
		await signUpEmail(undefined, validFormData);
		expect(mockAuth.api.signUpEmail).toHaveBeenCalledWith({
			body: { email: "new@example.com", password: "SecureP@ss123", name: "Marie Dupont" },
		});
	});

	it("should return generic error on auth API failure (anti-enumeration)", async () => {
		mockAuth.api.signUpEmail.mockRejectedValue(new Error("Email already exists"));
		const result = await signUpEmail(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		// Should NOT expose that email is already used
		expect(result.message).not.toContain("already");
	});

	it("should handle unexpected error gracefully", async () => {
		mockHeaders.mockRejectedValue(new Error("Headers error"));
		const result = await signUpEmail(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
