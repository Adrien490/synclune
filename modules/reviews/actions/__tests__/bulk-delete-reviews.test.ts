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
	mockDeleteUploadThingFiles,
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
	mockDeleteUploadThingFiles: vi.fn(),
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
	REVIEWS_CACHE_TAGS: {
		USER: (id: string) => `reviews-user-${id}`,
		REVIEWABLE: (id: string) => `reviewable-${id}`,
		ADMIN_LIST: "reviews-admin-list",
	},
	getReviewModerationTags: mockGetReviewModerationTags,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		DELETE_FAILED: "Erreur suppression",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	bulkDeleteReviewsSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../services/review-stats.service", () => ({
	updateProductReviewStats: mockUpdateProductReviewStats,
}));
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: mockDeleteUploadThingFiles,
}));

import { bulkDeleteReviews } from "../bulk-delete-reviews";

// ============================================================================
// HELPERS
// ============================================================================

const REVIEW_IDS = ["rev-1", "rev-2"];

function makeReviews() {
	return [
		{
			id: "rev-1",
			productId: "prod-1",
			userId: "user-1",
			medias: [{ url: "https://cdn/img1.jpg" }],
		},
		{ id: "rev-2", productId: "prod-2", userId: "user-2", medias: [] },
	];
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteReviews", () => {
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
		mockGetReviewModerationTags.mockReturnValue(["tag-1", "tag-2"]);
		mockDeleteUploadThingFiles.mockResolvedValue(undefined);

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

		const result = await bulkDeleteReviews(undefined, createMockFormData({ ids: "[]" }));

		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.productReview.findMany).not.toHaveBeenCalled();
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});

		const result = await bulkDeleteReviews(undefined, createMockFormData({ ids: "[]" }));

		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when schema validation fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ path: ["ids"], message: "Requis" }] },
		});

		const result = await bulkDeleteReviews(undefined, createMockFormData({ ids: "[]" }));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns error when no reviews found", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);

		const result = await bulkDeleteReviews(
			undefined,
			createMockFormData({ ids: JSON.stringify(REVIEW_IDS) }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Aucun avis trouvé");
	});

	it("soft-deletes all found reviews in a transaction", async () => {
		const formData = createMockFormData({ ids: JSON.stringify(REVIEW_IDS) });

		await bulkDeleteReviews(undefined, formData);

		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(mockPrisma.productReview.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: REVIEW_IDS },
				}),
				data: { deletedAt: expect.any(Date) },
			}),
		);
	});

	it("recalculates stats for all unique affected products (dedup)", async () => {
		// Two reviews with same productId
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: "rev-1", productId: "prod-1", userId: "user-1", medias: [] },
			{ id: "rev-2", productId: "prod-1", userId: "user-2", medias: [] },
		]);

		const formData = createMockFormData({ ids: JSON.stringify(["rev-1", "rev-2"]) });
		await bulkDeleteReviews(undefined, formData);

		// Should only recalculate once for prod-1 (deduped)
		expect(mockUpdateProductReviewStats).toHaveBeenCalledTimes(1);
		expect(mockUpdateProductReviewStats).toHaveBeenCalledWith(mockPrisma, "prod-1");
	});

	it("triggers UploadThing cleanup fire-and-forget for review media", async () => {
		const formData = createMockFormData({ ids: JSON.stringify(REVIEW_IDS) });

		await bulkDeleteReviews(undefined, formData);

		expect(mockDeleteUploadThingFiles).toHaveBeenCalledWith(["https://cdn/img1.jpg"]);
	});

	it("does not call UploadThing cleanup when no media exists", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: "rev-1", productId: "prod-1", userId: "user-1", medias: [] },
		]);

		const formData = createMockFormData({ ids: JSON.stringify(["rev-1"]) });
		await bulkDeleteReviews(undefined, formData);

		expect(mockDeleteUploadThingFiles).not.toHaveBeenCalled();
	});

	it("invalidates cache tags for reviews, users, and products", async () => {
		const formData = createMockFormData({ ids: JSON.stringify(REVIEW_IDS) });

		await bulkDeleteReviews(undefined, formData);

		// Should invalidate moderation tags + user tags + admin list
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("returns success with count of deleted reviews", async () => {
		const formData = createMockFormData({ ids: JSON.stringify(REVIEW_IDS) });

		const result = await bulkDeleteReviews(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("2"),
			expect.objectContaining({ count: 2 }),
		);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));

		const formData = createMockFormData({ ids: JSON.stringify(REVIEW_IDS) });
		const result = await bulkDeleteReviews(undefined, formData);

		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur suppression");
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("handles malformed JSON in formData gracefully", async () => {
		mockSafeParse.mockReturnValue({
			success: true,
			data: { ids: [] },
		});
		mockPrisma.productReview.findMany.mockResolvedValue([]);

		const formData = createMockFormData({ ids: "not-valid-json" });
		const result = await bulkDeleteReviews(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
