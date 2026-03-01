import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockSuccess,
	mockError,
	mockForbidden,
	mockValidationError,
	mockHandleActionError,
	mockSanitizeText,
	mockCanUserReviewProduct,
	mockUpdateProductReviewStats,
	mockSafeParse,
	mockGetReviewInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { create: vi.fn() },
		reviewMedia: { createMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockForbidden: vi.fn(),
	mockValidationError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockCanUserReviewProduct: vi.fn(),
	mockUpdateProductReviewStats: vi.fn(),
	mockSafeParse: vi.fn(),
	mockGetReviewInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ PRODUCT_LIMITS: { REVIEW: "product-review" } }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	success: mockSuccess,
	error: mockError,
	forbidden: mockForbidden,
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../constants/cache", () => ({
	getReviewInvalidationTags: mockGetReviewInvalidationTags,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Donnees invalides.",
		ALREADY_REVIEWED: "Vous avez deja laisse un avis.",
		NO_PURCHASE: "Vous n'avez pas achete ce produit.",
		ORDER_NOT_DELIVERED: "La commande n'a pas encore ete livree.",
		CREATE_FAILED: "Erreur lors de la creation de l'avis.",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	createReviewSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../services/review-stats.service", () => ({
	updateProductReviewStats: mockUpdateProductReviewStats,
}));
vi.mock("../../data/can-user-review-product", () => ({
	canUserReviewProduct: mockCanUserReviewProduct,
}));
vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {
		PrismaClientKnownRequestError: class extends Error {
			code: string;
			constructor(msg: string, meta: { code: string }) {
				super(msg);
				this.code = meta.code;
			}
		},
	},
}));

import { createReview } from "../create-review";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	productId: VALID_CUID,
	orderItemId: "item-1",
	rating: "5",
	title: "Super produit",
	content: "Tres bien fait",
	media: "[]",
});

// ============================================================================
// TESTS
// ============================================================================

describe("createReview", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockGetReviewInvalidationTags.mockReturnValue(["reviews-list"]);

		// Re-setup safeParse mock after resetAllMocks
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				productId: VALID_CUID,
				orderItemId: "item-1",
				rating: 5,
				title: "Super produit",
				content: "Tres bien fait",
				media: [],
			},
		});

		mockCanUserReviewProduct.mockResolvedValue({
			canReview: true,
			orderItemId: "item-1",
		});
		mockUpdateProductReviewStats.mockResolvedValue(undefined);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.productReview.create.mockResolvedValue({ id: "review-1", productId: VALID_CUID });
		mockPrisma.reviewMedia.createMany.mockResolvedValue({ count: 0 });

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockForbidden.mockImplementation((msg: string) => ({
			status: ActionStatus.FORBIDDEN,
			message: msg,
		}));
		mockValidationError.mockImplementation((msg: string) => ({
			status: ActionStatus.VALIDATION_ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await createReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await createReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should check eligibility before creating review", async () => {
		mockCanUserReviewProduct.mockResolvedValue({ canReview: false, reason: "already_reviewed" });
		const result = await createReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("should create review in transaction", async () => {
		const result = await createReview(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should update product review stats after creation", async () => {
		await createReview(undefined, validFormData);
		expect(mockUpdateProductReviewStats).toHaveBeenCalled();
	});

	it("should invalidate cache after creation", async () => {
		await createReview(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should sanitize title and content", async () => {
		await createReview(undefined, validFormData);
		expect(mockSanitizeText).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await createReview(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
