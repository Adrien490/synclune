import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData } from "@/test/factories"

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
} = vi.hoisted(() => ({
	mockAuth: {
		api: {
			resetPassword: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockCheckArcjet: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
}))

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }))
vi.mock("next/headers", () => ({ headers: mockHeaders }))
vi.mock("../../utils/arcjet-protection", () => ({ checkArcjetProtection: mockCheckArcjet }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
}))
vi.mock("../schemas/auth.schemas", () => ({ resetPasswordSchema: {} }))

import { resetPassword } from "../reset-password"

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	password: "NewP@ss123",
	confirmPassword: "NewP@ss123",
	token: "valid-reset-token-abc123",
})

const validatedData = {
	password: "NewP@ss123",
	token: "valid-reset-token-abc123",
}

// ============================================================================
// TESTS
// ============================================================================

describe("resetPassword", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockHeaders.mockResolvedValue(new Headers())
		mockCheckArcjet.mockResolvedValue(null)
		mockValidateInput.mockReturnValue({ data: { ...validatedData } })
		mockAuth.api.resetPassword.mockResolvedValue({})

		mockSuccess.mockImplementation((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg }))
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
	})

	it("should block when Arcjet protection triggers", async () => {
		const arcjetError = { status: ActionStatus.ERROR, message: "Blocked" }
		mockCheckArcjet.mockResolvedValue(arcjetError)
		const result = await resetPassword(undefined, validFormData)
		expect(result).toEqual(arcjetError)
	})

	it("should return validation error for invalid data", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Mot de passe invalide" }
		mockValidateInput.mockReturnValue({ error: valErr })
		const result = await resetPassword(undefined, validFormData)
		expect(result).toEqual(valErr)
	})

	it("should succeed when password reset is valid", async () => {
		const result = await resetPassword(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("réinitialisé")
	})

	it("should call auth.api.resetPassword with correct body", async () => {
		await resetPassword(undefined, validFormData)
		expect(mockAuth.api.resetPassword).toHaveBeenCalledWith({
			body: { newPassword: "NewP@ss123", token: "valid-reset-token-abc123" },
		})
	})

	it("should return specific error for invalid token", async () => {
		mockAuth.api.resetPassword.mockRejectedValue(new Error("Invalid token"))
		const result = await resetPassword(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("invalide")
	})

	it("should return specific error for expired token", async () => {
		mockAuth.api.resetPassword.mockRejectedValue(new Error("Token expired"))
		const result = await resetPassword(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("expiré")
	})

	it("should return generic error on unexpected failure", async () => {
		mockAuth.api.resetPassword.mockRejectedValue(new Error("Unknown server error"))
		const result = await resetPassword(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("réinitialisation")
	})

	it("should return generic error when headers call fails", async () => {
		mockHeaders.mockRejectedValue(new Error("Headers unavailable"))
		const result = await resetPassword(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
