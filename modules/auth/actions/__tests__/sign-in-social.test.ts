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
			signInSocial: vi.fn(),
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
vi.mock("../schemas/auth.schemas", () => ({ signInSocialSchema: {} }))

import { signInSocial } from "../sign-in-social"

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	provider: "google",
	callbackURL: "/boutique",
})

const validatedData = {
	provider: "google" as const,
	callbackURL: "/boutique",
}

// ============================================================================
// TESTS
// ============================================================================

describe("signInSocial", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockHeaders.mockResolvedValue(new Headers())
		mockCheckArcjet.mockResolvedValue(null)
		mockAuth.api.getSession.mockResolvedValue(null)
		mockValidateInput.mockReturnValue({ data: { ...validatedData } })
		mockAuth.api.signInSocial.mockResolvedValue({ url: "https://accounts.google.com/oauth" })
		mockIsRedirectError.mockReturnValue(false)

		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
		mockUnauthorized.mockImplementation((msg: string) => ({ status: ActionStatus.UNAUTHORIZED, message: msg }))
	})

	it("should block when Arcjet protection triggers", async () => {
		const arcjetError = { status: ActionStatus.ERROR, message: "Trop de tentatives" }
		mockCheckArcjet.mockResolvedValue(arcjetError)

		const result = await signInSocial(undefined, validFormData)

		expect(result).toEqual(arcjetError)
		expect(mockAuth.api.getSession).not.toHaveBeenCalled()
	})

	it("should return unauthorized when user is already logged in", async () => {
		mockAuth.api.getSession.mockResolvedValue({ user: { id: "user-1" } })

		const result = await signInSocial(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
		expect(mockUnauthorized).toHaveBeenCalledWith("Vous êtes déjà connecté")
	})

	it("should return validation error for invalid data", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Le provider est requis" }
		mockValidateInput.mockReturnValue({ error: valErr })

		const result = await signInSocial(undefined, validFormData)

		expect(result).toEqual(valErr)
		expect(mockAuth.api.signInSocial).not.toHaveBeenCalled()
	})

	it("should call signInSocial with validated provider and callbackURL", async () => {
		const redirectError = new Error("REDIRECT")
		mockRedirect.mockImplementation(() => { throw redirectError })
		mockIsRedirectError.mockReturnValue(true)

		await expect(signInSocial(undefined, validFormData)).rejects.toThrow("REDIRECT")

		expect(mockAuth.api.signInSocial).toHaveBeenCalledWith({
			body: { provider: "google", callbackURL: "/boutique" },
		})
	})

	it("should redirect to the OAuth URL returned by signInSocial", async () => {
		const redirectError = new Error("REDIRECT")
		mockRedirect.mockImplementation(() => { throw redirectError })
		mockIsRedirectError.mockReturnValue(true)

		await expect(signInSocial(undefined, validFormData)).rejects.toThrow("REDIRECT")

		expect(mockRedirect).toHaveBeenCalledWith("https://accounts.google.com/oauth")
	})

	it("should return error when signInSocial returns no URL", async () => {
		mockAuth.api.signInSocial.mockResolvedValue({ url: null })

		const result = await signInSocial(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.ERROR)
		expect(mockError).toHaveBeenCalledWith("URL de redirection manquante")
	})

	it("should return error when signInSocial returns undefined", async () => {
		mockAuth.api.signInSocial.mockResolvedValue(null)

		const result = await signInSocial(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.ERROR)
		expect(mockError).toHaveBeenCalledWith("URL de redirection manquante")
	})

	it("should rethrow redirect errors from Next.js", async () => {
		const redirectError = new Error("NEXT_REDIRECT")
		mockRedirect.mockImplementation(() => { throw redirectError })
		mockIsRedirectError.mockReturnValue(true)

		await expect(signInSocial(undefined, validFormData)).rejects.toThrow("NEXT_REDIRECT")
	})

	it("should return generic error on unexpected exception", async () => {
		mockAuth.api.signInSocial.mockRejectedValue(new Error("Network failure"))
		mockIsRedirectError.mockReturnValue(false)

		const result = await signInSocial(undefined, validFormData)

		expect(result.status).toBe(ActionStatus.ERROR)
		expect(mockError).toHaveBeenCalledWith(
			"Une erreur est survenue lors de la connexion. Veuillez réessayer."
		)
	})

	it("should use default callbackURL '/' when not provided", async () => {
		const formDataNoCallback = createMockFormData({ provider: "google" })
		mockValidateInput.mockReturnValue({ data: { provider: "google", callbackURL: "/" } })
		mockAuth.api.signInSocial.mockResolvedValue({ url: "https://accounts.google.com/oauth" })
		const redirectError = new Error("REDIRECT")
		mockRedirect.mockImplementation(() => { throw redirectError })
		mockIsRedirectError.mockReturnValue(true)

		await expect(signInSocial(undefined, formDataNoCallback)).rejects.toThrow("REDIRECT")

		expect(mockAuth.api.signInSocial).toHaveBeenCalledWith(
			expect.objectContaining({ body: expect.objectContaining({ callbackURL: "/" }) })
		)
	})
})
