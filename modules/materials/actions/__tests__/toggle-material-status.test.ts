import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData, VALID_CUID } from "@/test/factories"

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockGetMaterialInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetMaterialInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }))

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}))

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}))

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_MATERIAL_LIMITS: { TOGGLE_STATUS: "admin-material-toggle" },
}))

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}))

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string) => ({ status: ActionStatus.SUCCESS, message }),
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
}))

vi.mock("../../constants/cache", () => ({
	getMaterialInvalidationTags: mockGetMaterialInvalidationTags,
}))

vi.mock("../../schemas/materials.schemas", () => ({
	toggleMaterialStatusSchema: {},
}))

import { toggleMaterialStatus } from "../toggle-material-status"

// ============================================================================
// HELPERS
// ============================================================================

function makeFormData(id = VALID_CUID, isActive = "true") {
	return createMockFormData({ id, isActive })
}

function createMockMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		name: "Argent 925",
		slug: "argent-925",
		isActive: true,
		...overrides,
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe("toggleMaterialStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ session: { user: { id: "admin-1" } } })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockGetMaterialInvalidationTags.mockReturnValue(["materials-list", "material-argent-925"])
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}))
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { id: string; isActive: boolean },
		}))

		mockPrisma.material.findUnique.mockResolvedValue(createMockMaterial())
		mockPrisma.material.update.mockResolvedValue({})
	})

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" }
		mockRequireAdmin.mockResolvedValue({ error: authError })

		const result = await toggleMaterialStatus(undefined, makeFormData())

		expect(result).toEqual(authError)
		expect(mockPrisma.material.findUnique).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" }
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError })

		const result = await toggleMaterialStatus(undefined, makeFormData())

		expect(result).toEqual(rateLimitError)
		expect(mockPrisma.material.findUnique).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Données invalides" }
		mockValidateInput.mockReturnValue({ error: validationError })

		const result = await toggleMaterialStatus(undefined, makeFormData())

		expect(result).toEqual(validationError)
		expect(mockPrisma.material.findUnique).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// isActive parsing
	// --------------------------------------------------------------------------

	it("should parse isActive as true when formData value is 'true'", async () => {
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => {
			expect((data as { isActive: boolean }).isActive).toBe(true)
			return { data: data as { id: string; isActive: boolean } }
		})

		await toggleMaterialStatus(undefined, makeFormData(VALID_CUID, "true"))
	})

	it("should parse isActive as false when formData value is 'false'", async () => {
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => {
			expect((data as { isActive: boolean }).isActive).toBe(false)
			return { data: { id: VALID_CUID, isActive: false } }
		})

		await toggleMaterialStatus(undefined, makeFormData(VALID_CUID, "false"))
	})

	// --------------------------------------------------------------------------
	// Not found
	// --------------------------------------------------------------------------

	it("should return error when material does not exist", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } })
		mockPrisma.material.findUnique.mockResolvedValue(null)

		const result = await toggleMaterialStatus(undefined, makeFormData())

		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("n'existe pas")
		expect(mockPrisma.material.update).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// Activation
	// --------------------------------------------------------------------------

	it("should activate material and return success message", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } })
		mockPrisma.material.findUnique.mockResolvedValue(createMockMaterial({ isActive: false }))

		const result = await toggleMaterialStatus(undefined, makeFormData(VALID_CUID, "true"))

		expect(mockPrisma.material.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { isActive: true },
		})
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("activé")
	})

	it("should deactivate material and return success message", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: false } })
		mockPrisma.material.findUnique.mockResolvedValue(createMockMaterial({ isActive: true }))

		const result = await toggleMaterialStatus(undefined, makeFormData(VALID_CUID, "false"))

		expect(mockPrisma.material.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { isActive: false },
		})
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("désactivé")
	})

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate material cache tags using the material slug", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } })
		mockPrisma.material.findUnique.mockResolvedValue(createMockMaterial({ slug: "argent-925" }))

		await toggleMaterialStatus(undefined, makeFormData())

		expect(mockGetMaterialInvalidationTags).toHaveBeenCalledWith("argent-925")
		expect(mockUpdateTag).toHaveBeenCalledWith("materials-list")
		expect(mockUpdateTag).toHaveBeenCalledWith("material-argent-925")
	})

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { id: VALID_CUID, isActive: true } })
		mockPrisma.material.findUnique.mockRejectedValue(new Error("DB crash"))

		const result = await toggleMaterialStatus(undefined, makeFormData())

		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
