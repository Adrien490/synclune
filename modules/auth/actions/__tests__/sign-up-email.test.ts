import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAuth,
	mockHeaders,
	mockCheckArcjet,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockUnauthorized,
	mockPrismaUserUpdate,
} = vi.hoisted(() => ({
	mockAuth: {
		api: {
			getSession: vi.fn(),
			signUpEmail: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockCheckArcjet: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockUnauthorized: vi.fn(),
	mockPrismaUserUpdate: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("../../utils/arcjet-protection", () => ({ checkArcjetProtection: mockCheckArcjet }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	unauthorized: mockUnauthorized,
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
	termsAccepted: "true",
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
		mockCheckArcjet.mockResolvedValue(null);
		mockAuth.api.getSession.mockResolvedValue(null);
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
		mockPrismaUserUpdate.mockResolvedValue({});
	});

	it("should block when Arcjet protection triggers", async () => {
		const arcjetError = { status: ActionStatus.ERROR, message: "Blocked" };
		mockCheckArcjet.mockResolvedValue(arcjetError);
		const result = await signUpEmail(undefined, validFormData);
		expect(result).toEqual(arcjetError);
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

	it("should return error when signUpEmail returns null", async () => {
		mockAuth.api.signUpEmail.mockResolvedValue(null);
		const result = await signUpEmail(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should handle unexpected error gracefully", async () => {
		mockHeaders.mockRejectedValue(new Error("Headers error"));
		const result = await signUpEmail(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
