import { describe, it, expect, vi, beforeEach } from "vitest"
import { ActionStatus } from "@/shared/types/server-action"
import { VALID_CUID, VALID_CUID_2 } from "@/test/factories"

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
	mockGetDiscountInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
}))

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}))

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}))

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}))

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { BULK_OPERATIONS: "admin-discount-bulk" },
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
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
}))

vi.mock("../../schemas/discount.schemas", () => ({
	bulkDeleteDiscountsSchema: {},
}))

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		DELETE_FAILED: "Erreur lors de la suppression du code promo",
	},
}))

import { bulkDeleteDiscounts } from "../bulk-delete-discounts"

// ============================================================================
// HELPERS
// ============================================================================

const VALID_IDS = [VALID_CUID, VALID_CUID_2]

/**
 * Note: bulkDeleteDiscounts uses formData.getAll("ids") (not formData.get("ids"))
 * so FormData needs multiple "ids" values appended
 */
function makeFormData(ids: string[] = VALID_IDS): FormData {
	const formData = new FormData()
	for (const id of ids) {
		formData.append("ids", id)
	}
	return formData
}

function createMockDiscount(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		code: "PROMO10",
		_count: { usages: 0 },
		...overrides,
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteDiscounts", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ session: { user: { id: "admin-1" } } })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-PROMO10"])
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}))
		mockValidateInput.mockImplementation((_schema: unknown, data: unknown) => ({
			data: data as { ids: string[] },
		}))

		mockPrisma.discount.findMany.mockResolvedValue([
			createMockDiscount({ id: VALID_CUID, code: "PROMO10", _count: { usages: 0 } }),
			createMockDiscount({ id: VALID_CUID_2, code: "PROMO20", _count: { usages: 0 } }),
		])
		mockPrisma.discount.updateMany.mockResolvedValue({ count: 2 })
	})

	// --------------------------------------------------------------------------
	// Auth
	// --------------------------------------------------------------------------

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" }
		mockRequireAdmin.mockResolvedValue({ error: authError })

		const result = await bulkDeleteDiscounts(undefined, makeFormData())

		expect(result).toEqual(authError)
		expect(mockPrisma.discount.findMany).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// Rate limit
	// --------------------------------------------------------------------------

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" }
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError })

		const result = await bulkDeleteDiscounts(undefined, makeFormData())

		expect(result).toEqual(rateLimitError)
		expect(mockPrisma.discount.findMany).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// Validation
	// --------------------------------------------------------------------------

	it("should return validation error when validateInput fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "IDs invalides" }
		mockValidateInput.mockReturnValue({ error: validationError })

		const result = await bulkDeleteDiscounts(undefined, makeFormData())

		expect(result).toEqual(validationError)
		expect(mockPrisma.discount.findMany).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// All discounts have usages - nothing deletable
	// --------------------------------------------------------------------------

	it("should return error when all discounts have usages", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.discount.findMany.mockResolvedValue([
			createMockDiscount({ id: VALID_CUID, _count: { usages: 5 } }),
			createMockDiscount({ id: VALID_CUID_2, _count: { usages: 2 } }),
		])

		const result = await bulkDeleteDiscounts(undefined, makeFormData())

		expect(result.status).toBe(ActionStatus.ERROR)
		expect(result.message).toContain("Aucun code")
		expect(mockPrisma.discount.updateMany).not.toHaveBeenCalled()
	})

	// --------------------------------------------------------------------------
	// Soft-delete (updateMany with deletedAt)
	// --------------------------------------------------------------------------

	it("should soft-delete discounts with no usages", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.discount.findMany.mockResolvedValue([
			createMockDiscount({ id: VALID_CUID, code: "PROMO10", _count: { usages: 0 } }),
			createMockDiscount({ id: VALID_CUID_2, code: "PROMO20", _count: { usages: 0 } }),
		])
		mockPrisma.discount.updateMany.mockResolvedValue({ count: 2 })

		const result = await bulkDeleteDiscounts(undefined, makeFormData())

		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: VALID_IDS } },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			})
		)
		expect(result.status).toBe(ActionStatus.SUCCESS)
	})

	it("should only delete discounts with no usages and skip those with usages", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.discount.findMany.mockResolvedValue([
			createMockDiscount({ id: VALID_CUID, code: "PROMO10", _count: { usages: 0 } }),
			createMockDiscount({ id: VALID_CUID_2, code: "PROMO20", _count: { usages: 3 } }),
		])
		mockPrisma.discount.updateMany.mockResolvedValue({ count: 1 })

		const result = await bulkDeleteDiscounts(undefined, makeFormData())

		expect(mockPrisma.discount.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: { in: [VALID_CUID] } } })
		)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.message).toContain("ignoré")
	})

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	it("should invalidate cache for each deleted discount", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.discount.findMany.mockResolvedValue([
			createMockDiscount({ id: VALID_CUID, code: "PROMO10", _count: { usages: 0 } }),
			createMockDiscount({ id: VALID_CUID_2, code: "PROMO20", _count: { usages: 0 } }),
		])
		mockPrisma.discount.updateMany.mockResolvedValue({ count: 2 })

		await bulkDeleteDiscounts(undefined, makeFormData())

		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("PROMO10")
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("PROMO20")
	})

	it("should not invalidate cache for discounts that were skipped", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.discount.findMany.mockResolvedValue([
			createMockDiscount({ id: VALID_CUID, code: "PROMO10", _count: { usages: 0 } }),
			createMockDiscount({ id: VALID_CUID_2, code: "PROMO20", _count: { usages: 2 } }),
		])
		mockPrisma.discount.updateMany.mockResolvedValue({ count: 1 })

		await bulkDeleteDiscounts(undefined, makeFormData())

		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("PROMO10")
		expect(mockGetDiscountInvalidationTags).not.toHaveBeenCalledWith("PROMO20")
	})

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { ids: VALID_IDS } })
		mockPrisma.discount.findMany.mockRejectedValue(new Error("DB crash"))

		const result = await bulkDeleteDiscounts(undefined, makeFormData())

		expect(mockHandleActionError).toHaveBeenCalled()
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
