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
	mockSuccess,
	mockNotFound,
	mockValidationError,
	mockHandleActionError,
	mockGetReviewModerationTags,
	mockUpdateProductReviewStats,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findFirst: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockValidationError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetReviewModerationTags: vi.fn(),
	mockUpdateProductReviewStats: vi.fn(),
	mockSafeParse: vi.fn(),
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
	ADMIN_REVIEW_LIMITS: { MODERATE: "moderate" },
}))
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}))
vi.mock("@/shared/lib/actions", () => ({
	success: mockSuccess,
	notFound: mockNotFound,
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}))
vi.mock("../../constants/cache", () => ({
	getReviewModerationTags: mockGetReviewModerationTags,
}))
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		MODERATE_FAILED: "Erreur modération",
	},
}))
vi.mock("../../schemas/review.schemas", () => ({
	moderateReviewSchema: { safeParse: mockSafeParse },
}))
vi.mock("../../services/review-stats.service", () => ({
	updateProductReviewStats: mockUpdateProductReviewStats,
}))

import { moderateReview } from "../moderate-review"

// ============================================================================
// HELPERS
// ============================================================================

const VALID_REVIEW_ID = VALID_CUID
const VALID_PRODUCT_ID = "prod_cm1234567890abcde"

const validFormData = createMockFormData({ id: VALID_REVIEW_ID })

function makeReview(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_REVIEW_ID,
		productId: VALID_PRODUCT_ID,
		status: "PUBLISHED",
		...overrides,
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe("moderateReview", () => {
	beforeEach(() => {
		vi.resetAllMocks()

		mockRequireAdmin.mockResolvedValue({ session: { user: { role: "ADMIN" } } })
		mockEnforceRateLimit.mockResolvedValue({ success: true })
		mockSafeParse.mockReturnValue({ success: true, data: { id: VALID_REVIEW_ID } })
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview())
		mockPrisma.$transaction.mockImplementation((fn: Function) => fn(mockPrisma))
		mockPrisma.productReview.update.mockResolvedValue({})
		mockUpdateProductReviewStats.mockResolvedValue(undefined)
		mockGetReviewModerationTags.mockReturnValue(["moderation-tag-1", "moderation-tag-2"])

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}))
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}))
		mockValidationError.mockImplementation((msg: string) => ({
			status: ActionStatus.VALIDATION_ERROR,
			message: msg,
		}))
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}))
	})

	it("should return auth error when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		})
		const result = await moderateReview(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.FORBIDDEN)
		expect(mockPrisma.productReview.findFirst).not.toHaveBeenCalled()
	})

	it("should return rate limit error when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de tentatives" },
		})
		const result = await moderateReview(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.ERROR)
		expect(mockPrisma.productReview.findFirst).not.toHaveBeenCalled()
	})

	it("should return validation error when safeParse fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ path: ["id"], message: "ID invalide" }],
			},
		})
		const result = await moderateReview(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
		expect(mockValidationError).toHaveBeenCalledWith("id: ID invalide")
	})

	it("should return validation error using fallback message when path is empty", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ path: [], message: "ID requis" }],
			},
		})
		const result = await moderateReview(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR)
		expect(mockValidationError).toHaveBeenCalledWith("ID requis")
	})

	it("should return not found when review does not exist", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(null)
		const result = await moderateReview(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.NOT_FOUND)
		expect(mockNotFound).toHaveBeenCalledWith("Avis")
	})

	it("should toggle PUBLISHED to HIDDEN", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ status: "PUBLISHED" }))
		const result = await moderateReview(undefined, validFormData)
		expect(mockPrisma.productReview.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_REVIEW_ID },
				data: { status: "HIDDEN" },
			})
		)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(mockSuccess).toHaveBeenCalledWith(
			"Avis masqué avec succès",
			{ status: "HIDDEN" }
		)
	})

	it("should toggle HIDDEN to PUBLISHED", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ status: "HIDDEN" }))
		const result = await moderateReview(undefined, validFormData)
		expect(mockPrisma.productReview.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_REVIEW_ID },
				data: { status: "PUBLISHED" },
			})
		)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(mockSuccess).toHaveBeenCalledWith(
			"Avis republié avec succès",
			{ status: "PUBLISHED" }
		)
	})

	it("should recalculate product review stats in the transaction", async () => {
		await moderateReview(undefined, validFormData)
		expect(mockPrisma.$transaction).toHaveBeenCalled()
		expect(mockUpdateProductReviewStats).toHaveBeenCalledWith(
			mockPrisma,
			VALID_PRODUCT_ID
		)
	})

	it("should not recalculate stats when productId is null", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ productId: null }))
		await moderateReview(undefined, validFormData)
		expect(mockUpdateProductReviewStats).not.toHaveBeenCalled()
	})

	it("should invalidate cache tags after moderation", async () => {
		await moderateReview(undefined, validFormData)
		expect(mockGetReviewModerationTags).toHaveBeenCalledWith(
			VALID_PRODUCT_ID,
			VALID_REVIEW_ID
		)
		expect(mockUpdateTag).toHaveBeenCalledWith("moderation-tag-1")
		expect(mockUpdateTag).toHaveBeenCalledWith("moderation-tag-2")
	})

	it("should return data with new status in success response", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ status: "PUBLISHED" }))
		const result = await moderateReview(undefined, validFormData)
		expect(result.status).toBe(ActionStatus.SUCCESS)
		expect(result.data).toEqual({ status: "HIDDEN" })
	})

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"))
		const result = await moderateReview(undefined, validFormData)
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur modération"
		)
		expect(result.status).toBe(ActionStatus.ERROR)
	})
})
