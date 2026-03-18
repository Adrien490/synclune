import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAuth,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockAuth,
	mockHeaders,
} = vi.hoisted(() => ({
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockAuth: {
		api: {
			changeEmail: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAuth: mockRequireAuth,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	USER_LIMITS: { CHANGE_EMAIL: "user-change-email" },
}));

vi.mock("@/modules/auth/lib/auth", () => ({
	auth: mockAuth,
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));

vi.mock("../../schemas/user.schemas", () => ({
	changeEmailSchema: {},
}));

import { requestEmailChange } from "../request-email-change";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_NEW_EMAIL = "new@example.com";

function makeFormData(newEmail = VALID_NEW_EMAIL): FormData {
	return createMockFormData({ newEmail });
}

// ============================================================================
// TESTS
// ============================================================================

describe("requestEmailChange", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: { id: "user-1", email: "old@example.com" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { newEmail: VALID_NEW_EMAIL } });
		mockHeaders.mockResolvedValue(new Headers());
		mockAuth.api.changeEmail.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("returns auth error when user is not authenticated", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non connecte" };
		mockRequireAuth.mockResolvedValue({ error: authError });

		const result = await requestEmailChange(undefined, makeFormData());

		expect(result).toEqual(authError);
		expect(mockAuth.api.changeEmail).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("returns rate limit error when exceeded", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await requestEmailChange(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockAuth.api.changeEmail).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("returns validation error when email is invalid", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Email invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await requestEmailChange(undefined, makeFormData("not-an-email"));

		expect(result).toEqual(validationError);
		expect(mockAuth.api.changeEmail).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Email change request
	// --------------------------------------------------------------------------

	it("calls auth.api.changeEmail with the validated new email", async () => {
		await requestEmailChange(undefined, makeFormData());

		expect(mockAuth.api.changeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.objectContaining({ newEmail: VALID_NEW_EMAIL }),
			}),
		);
	});

	it("passes callbackURL to changeEmail", async () => {
		await requestEmailChange(undefined, makeFormData());

		expect(mockAuth.api.changeEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.objectContaining({ callbackURL: "/parametres" }),
			}),
		);
	});

	it("returns success with confirmation message", async () => {
		const result = await requestEmailChange(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("email de confirmation"));
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("calls handleActionError when auth.api.changeEmail throws", async () => {
		mockAuth.api.changeEmail.mockRejectedValue(new Error("Auth API error"));

		const result = await requestEmailChange(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
