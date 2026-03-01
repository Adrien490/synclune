import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockSuccess,
	mockError,
	mockValidationError,
	mockHandleActionError,
	mockGetReviewModerationTags,
	mockUpdateProductReviewStats,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findMany: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockValidationError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetReviewModerationTags: vi.fn(),
	mockUpdateProductReviewStats: vi.fn(),
	mockSafeParse: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_REVIEW_LIMITS: { BULK_OPERATIONS: "bulk" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	safeFormGetJSON: (formData: FormData, key: string) => {
		const v = formData.get(key);
		if (typeof v !== "string" || !v) return null;
		try {
			return JSON.parse(v);
		} catch {
			return null;
		}
	},
	success: mockSuccess,
	error: mockError,
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
}));
vi.mock("../../constants/cache", () => ({
	REVIEWS_CACHE_TAGS: { ADMIN_LIST: "reviews-admin-list" },
	getReviewModerationTags: mockGetReviewModerationTags,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		MODERATE_FAILED: "Erreur modération",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	bulkPublishReviewsSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../services/review-stats.service", () => ({
	updateProductReviewStats: mockUpdateProductReviewStats,
}));

import { bulkPublishReviews } from "../bulk-publish-reviews";

// ============================================================================
// HELPERS
// ============================================================================

const REVIEW_IDS = ["rev-1", "rev-2"];

function makeReviews() {
	return [
		{ id: "rev-1", productId: "prod-1" },
		{ id: "rev-2", productId: "prod-2" },
	];
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkPublishReviews", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeParse.mockReturnValue({ success: true, data: { ids: REVIEW_IDS } });
		mockPrisma.productReview.findMany.mockResolvedValue(makeReviews());
		mockPrisma.$transaction.mockImplementation((fn: Function) => fn(mockPrisma));
		mockPrisma.productReview.updateMany.mockResolvedValue({ count: 2 });
		mockUpdateProductReviewStats.mockResolvedValue(undefined);
		mockGetReviewModerationTags.mockReturnValue(["tag-1"]);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
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

	it("returns auth error when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await bulkPublishReviews(undefined, createMockFormData({ ids: "[]" }));
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await bulkPublishReviews(undefined, createMockFormData({ ids: "[]" }));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when schema fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ path: ["ids"], message: "Requis" }] },
		});
		const result = await bulkPublishReviews(undefined, createMockFormData({ ids: "[]" }));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns error when no reviews found", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		await bulkPublishReviews(undefined, createMockFormData({ ids: JSON.stringify(REVIEW_IDS) }));
		expect(mockError).toHaveBeenCalledWith("Aucun avis trouvé");
	});

	it("sets status to PUBLISHED for all reviews in transaction", async () => {
		await bulkPublishReviews(undefined, createMockFormData({ ids: JSON.stringify(REVIEW_IDS) }));

		expect(mockPrisma.productReview.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: "PUBLISHED" },
			}),
		);
	});

	it("recalculates stats for each affected product", async () => {
		await bulkPublishReviews(undefined, createMockFormData({ ids: JSON.stringify(REVIEW_IDS) }));
		expect(mockUpdateProductReviewStats).toHaveBeenCalledTimes(2);
	});

	it("invalidates cache tags including admin list", async () => {
		await bulkPublishReviews(undefined, createMockFormData({ ids: JSON.stringify(REVIEW_IDS) }));
		expect(mockUpdateTag).toHaveBeenCalledWith("reviews-admin-list");
	});

	it("returns success with count", async () => {
		const result = await bulkPublishReviews(
			undefined,
			createMockFormData({ ids: JSON.stringify(REVIEW_IDS) }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("publié"),
			expect.objectContaining({ count: 2 }),
		);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await bulkPublishReviews(
			undefined,
			createMockFormData({ ids: JSON.stringify(REVIEW_IDS) }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
