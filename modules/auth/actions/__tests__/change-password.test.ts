import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockAuth,
	mockHeaders,
	mockCheckArcjet,
	mockRequireAuth,
	mockPrisma,
	mockValidateInput,
	mockSuccess,
	mockError,
	mockSendPasswordChangedEmail,
} = vi.hoisted(() => ({
	mockAuth: { api: { changePassword: vi.fn() } },
	mockHeaders: vi.fn(),
	mockCheckArcjet: vi.fn(),
	mockRequireAuth: vi.fn(),
	mockPrisma: { user: { findUnique: vi.fn() } },
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSendPasswordChangedEmail: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("../../utils/arcjet-protection", () => ({ checkArcjetProtection: mockCheckArcjet }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/modules/emails/services/auth-emails", () => ({
	sendPasswordChangedEmail: mockSendPasswordChangedEmail,
}));
vi.mock("../schemas/auth.schemas", () => ({ changePasswordSchema: {} }));
vi.mock("../../services/hibp.service", () => ({
	checkPasswordBreached: vi.fn().mockResolvedValue(0),
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
		mockCheckArcjet.mockResolvedValue(null);
		mockRequireAuth.mockResolvedValue({
			user: { id: VALID_USER_ID, email: "user@example.com", name: "User" },
		});
		mockPrisma.user.findUnique.mockResolvedValue({
			emailVerified: true,
			accounts: [{ providerId: "credential" }],
		});
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockAuth.api.changePassword.mockResolvedValue({});
		mockSendPasswordChangedEmail.mockResolvedValue(undefined);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
	});

	it("should block when Arcjet protection triggers", async () => {
		mockCheckArcjet.mockResolvedValue({ status: ActionStatus.ERROR, message: "Blocked" });
		const result = await changePassword(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
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

	it("should send password changed email notification", async () => {
		await changePassword(undefined, validFormData);
		expect(mockSendPasswordChangedEmail).toHaveBeenCalledWith(
			expect.objectContaining({ to: "user@example.com" }),
		);
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
});
