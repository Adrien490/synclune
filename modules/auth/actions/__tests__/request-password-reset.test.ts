import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAuth, mockHeaders, mockCheckArcjet, mockValidateInput, mockSuccess, mockError } =
	vi.hoisted(() => ({
		mockAuth: {
			api: {
				requestPasswordReset: vi.fn(),
			},
		},
		mockHeaders: vi.fn(),
		mockCheckArcjet: vi.fn(),
		mockValidateInput: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
	}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("../../utils/arcjet-protection", () => ({ checkArcjetProtection: mockCheckArcjet }));
vi.mock("@/shared/lib/actions", () => ({
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

		mockHeaders.mockResolvedValue(new Headers());
		mockCheckArcjet.mockResolvedValue(null);
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockAuth.api.requestPasswordReset.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
	});

	it("should block when Arcjet protection triggers", async () => {
		const arcjetError = { status: ActionStatus.ERROR, message: "Blocked" };
		mockCheckArcjet.mockResolvedValue(arcjetError);
		const result = await requestPasswordReset(undefined, validFormData);
		expect(result).toEqual(arcjetError);
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
		// Success case
		const successResult = await requestPasswordReset(undefined, validFormData);

		// Failure case (e.g. unknown email)
		mockAuth.api.requestPasswordReset.mockRejectedValue(new Error("Email not found"));
		const failureResult = await requestPasswordReset(undefined, validFormData);

		// Both paths must return identical messages to prevent email enumeration
		expect(successResult.status).toBe(ActionStatus.SUCCESS);
		expect(failureResult.status).toBe(ActionStatus.SUCCESS);
		expect(successResult.message).toBe(failureResult.message);
	});

	it("should return generic error on outer catch (e.g. headers failure)", async () => {
		mockHeaders.mockRejectedValue(new Error("Fatal headers error"));
		const result = await requestPasswordReset(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("inattendue");
	});
});
