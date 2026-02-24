import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { createMockFormData } from "@/test/factories"

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
	mockSuccess,
	mockError,
	mockGenerateSlug,
	mockSanitizeText,
	mockGetMaterialInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: { findFirst: vi.fn(), create: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockGenerateSlug: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockGetMaterialInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }))
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({ enforceRateLimitForCurrentUser: mockEnforceRateLimit }))
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_MATERIAL_LIMITS: { CREATE: "mat-create" } }))
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}))
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }))
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }))
vi.mock("../../schemas/materials.schemas", () => ({ createMaterialSchema: {} }))
vi.mock("../../constants/cache", () => ({
	getMaterialInvalidationTags: mockGetMaterialInvalidationTags,
}))

import { createMaterial } from "../create-material"

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ name: "Argent 925" })

// ============================================================================
// TESTS
// ============================================================================

describe("createMaterial", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ success: true })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockValidateInput.mockReturnValue({ data: { name: "Argent 925", description: null } })
		mockSanitizeText.mockImplementation((t: string) => t)
		mockGenerateSlug.mockResolvedValue("argent-925")
		mockGetMaterialInvalidationTags.mockReturnValue(["materials-list"])
		mockPrisma.material.findFirst.mockResolvedValue(null)
		mockPrisma.material.create.mockResolvedValue({ id: "mat-1" })

		mockSuccess.mockImplementation((msg: string) => ({ status: ActionStatus.SUCCESS, message: msg }))
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({ status: ActionStatus.ERROR, message: fallback }))
	})

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({ error: { status: ActionStatus.UNAUTHORIZED, message: "No" } })
		const result = await createMaterial(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED)
	})

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({ error: { status: ActionStatus.ERROR, message: "Rate" } })
		const result = await createMaterial(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
	})

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({ error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" } })
		const result = await createMaterial(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
	})

	it("should return error when name already exists", async () => {
		mockPrisma.material.findFirst.mockResolvedValue({ id: "existing" })
		const result = await createMaterial(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("existe")
	})

	it("should generate slug and create material", async () => {
		const result = await createMaterial(undefined, validFormData)
		expect(mockGenerateSlug).toHaveBeenCalled()
		expect(mockPrisma.material.create).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should invalidate cache after creation", async () => {
		await createMaterial(undefined, validFormData)
		expect(mockUpdateTag).toHaveBeenCalled()
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.material.create.mockRejectedValue(new Error("DB crash"))
		const result = await createMaterial(undefined, validFormData)
		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
