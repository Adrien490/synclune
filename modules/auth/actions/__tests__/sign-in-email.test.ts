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
	mockError,
	mockUnauthorized,
	mockRedirect,
	mockIsRedirectError,
} = vi.hoisted(() => ({
	mockAuth: {
		api: {
			getSession: vi.fn(),
			signInEmail: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockCheckArcjet: vi.fn(),
	mockValidateInput: vi.fn(),
	mockError: vi.fn(),
	mockUnauthorized: vi.fn(),
	mockRedirect: vi.fn(),
	mockIsRedirectError: vi.fn(),
}))

vi.mock("@/modules/auth/lib/auth", () => ({ auth: mockAuth }))
vi.mock("next/headers", () => ({ headers: mockHeaders }))
vi.mock("next/navigation", () => ({ redirect: mockRedirect }))
vi.mock("next/dist/client/components/redirect-error", () => ({ isRedirectError: mockIsRedirectError }))
vi.mock("../../utils/arcjet-protection", () => ({ checkArcjetProtection: mockCheckArcjet }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	error: mockError,
	unauthorized: mockUnauthorized,
}))
vi.mock("../schemas/auth.schemas", () => ({ signInEmailSchema: {} }))

import { signInEmail } from "../sign-in-email"

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	email: "user@example.com",
	password: "SecureP@ss123",
	callbackURL: "/boutique",
})

const validatedData = {
	email: "user@example.com",
	password: "SecureP@ss123",
	callbackURL: "/boutique",
}

// ============================================================================
// TESTS
// ============================================================================

describe("signInEmail", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockHeaders.mockResolvedValue(new Headers())
		mockCheckArcjet.mockResolvedValue(null)
		mockAuth.api.getSession.mockResolvedValue(null)
		mockValidateInput.mockReturnValue({ data: { ...validatedData } })
		mockAuth.api.signInEmail.mockResolvedValue({ user: { id: "user-1" } })
		mockIsRedirectError.mockReturnValue(false)

		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
		mockUnauthorized.mockImplementation((msg: string) => ({ status: ActionStatus.UNAUTHORIZED, message: msg }))
	})

	it("should block when Arcjet protection triggers", async () => {
		const arcjetError = { status: ActionStatus.ERROR, message: "Blocked" }
		mockCheckArcjet.mockResolvedValue(arcjetError)
		const result = await signInEmail(undefined, validFormData)
		expect(result).toEqual(arcjetError)
	})

	it("should return unauthorized when already logged in", async () => {
		mockAuth.api.getSession.mockResolvedValue({ user: { id: "user-1" } })
		const result = await signInEmail(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
	})

	it("should return validation error for invalid data", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" }
		mockValidateInput.mockReturnValue({ error: valErr })
		const result = await signInEmail(undefined, validFormData)
		expect(result).toEqual(valErr)
	})

	it("should redirect on successful sign in", async () => {
		// redirect throws in Next.js
		const redirectError = new Error("REDIRECT")
		mockRedirect.mockImplementation(() => { throw redirectError })
		mockIsRedirectError.mockReturnValue(true)

		await expect(signInEmail(undefined, validFormData)).rejects.toThrow("REDIRECT")
		expect(mockRedirect).toHaveBeenCalledWith("/boutique")
	})

	it("should return unauthorized on invalid credentials", async () => {
		mockAuth.api.signInEmail.mockRejectedValue(new Error("invalid email or password"))
		const result = await signInEmail(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
		expect(result.message).toContain("incorrect")
	})

	it("should return EMAIL_NOT_VERIFIED for unverified email", async () => {
		mockAuth.api.signInEmail.mockRejectedValue(new Error("email not verified"))
		const result = await signInEmail(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toBe("EMAIL_NOT_VERIFIED")
	})

	it("should return error when signInEmail returns null", async () => {
		mockAuth.api.signInEmail.mockResolvedValue(null)
		const result = await signInEmail(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return generic error on unexpected failure", async () => {
		mockAuth.api.signInEmail.mockRejectedValue(new Error("Unknown server error"))
		const result = await signInEmail(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("connexion")
	})
})
