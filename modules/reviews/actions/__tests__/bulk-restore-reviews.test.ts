import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockSuccess,
	mockError,
	mockValidationError,
	mockHandleActionError,
	mockGetReviewInvalidationTags,
	mockUpdateProductReviewStats,
	mockLogAudit,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findMany: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockValidationError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetReviewInvalidationTags: vi.fn(),
	mockUpdateProductReviewStats: vi.fn(),
	mockLogAudit: vi.fn(),
	mockSafeParse: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
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
	logAudit: mockLogAudit,
}));
vi.mock("../../constants/cache", () => ({
	REVIEWS_CACHE_TAGS: {
		ADMIN_LIST: "reviews-admin-list",
	},
	getReviewInvalidationTags: mockGetReviewInvalidationTags,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		RESTORE_FAILED: "Erreur restauration",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	bulkRestoreReviewsSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../services/review-stats.service", () => ({
	updateProductReviewStats: mockUpdateProductReviewStats,
}));

import { bulkRestoreReviews } from "../bulk-restore-reviews";

// ============================================================================
// TESTS
// ============================================================================

const IDS = [VALID_CUID, VALID_CUID_2];
const PRODUCT_A = "cmaaaaaaaaaaaaaaaaaaaaaap";
const PRODUCT_B = "cmbbbbbbbbbbbbbbbbbbbbbbp";
const USER_ID = "cm1234567890abcdefghijklm";

describe("bulkRestoreReviews", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.fr" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeParse.mockReturnValue({ success: true, data: { ids: IDS } });

		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: IDS[0], productId: PRODUCT_A, userId: USER_ID },
			{ id: IDS[1], productId: PRODUCT_B, userId: USER_ID },
		]);

		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
			return fn({
				productReview: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
			});
		});

		mockGetReviewInvalidationTags.mockReturnValue(["tag-a", "tag-b"]);
		mockLogAudit.mockResolvedValue(undefined);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
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
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await bulkRestoreReviews(
			undefined,
			createMockFormData({ ids: JSON.stringify(IDS) }),
		);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.productReview.findMany).not.toHaveBeenCalled();
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await bulkRestoreReviews(
			undefined,
			createMockFormData({ ids: JSON.stringify(IDS) }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when schema fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ path: ["ids"], message: "Liste invalide" }] },
		});
		const result = await bulkRestoreReviews(undefined, createMockFormData({ ids: "[]" }));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns error when no soft-deleted review found", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([]);
		const result = await bulkRestoreReviews(
			undefined,
			createMockFormData({ ids: JSON.stringify(IDS) }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Aucun avis supprimé trouvé");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("filters to deletedAt !== null in findMany where clause", async () => {
		await bulkRestoreReviews(undefined, createMockFormData({ ids: JSON.stringify(IDS) }));

		expect(mockPrisma.productReview.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: { in: IDS },
					deletedAt: { not: null },
				}),
			}),
		);
	});

	it("restores reviews and recalculates stats for each product in transaction", async () => {
		const txUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
			return fn({ productReview: { updateMany: txUpdateMany } });
		});

		const result = await bulkRestoreReviews(
			undefined,
			createMockFormData({ ids: JSON.stringify(IDS) }),
		);

		expect(txUpdateMany).toHaveBeenCalledWith({
			where: { id: { in: IDS }, deletedAt: { not: null } },
			data: { deletedAt: null },
		});
		expect(mockUpdateProductReviewStats).toHaveBeenCalledTimes(2);
		expect(mockUpdateProductReviewStats).toHaveBeenCalledWith(expect.anything(), PRODUCT_A);
		expect(mockUpdateProductReviewStats).toHaveBeenCalledWith(expect.anything(), PRODUCT_B);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("deduplicates productIds before stats recalc", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: IDS[0], productId: PRODUCT_A, userId: USER_ID },
			{ id: IDS[1], productId: PRODUCT_A, userId: USER_ID },
		]);

		await bulkRestoreReviews(undefined, createMockFormData({ ids: JSON.stringify(IDS) }));

		expect(mockUpdateProductReviewStats).toHaveBeenCalledTimes(1);
	});

	it("skips orphan productIds (null) in stats recalc", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: IDS[0], productId: null, userId: USER_ID },
		]);

		await bulkRestoreReviews(undefined, createMockFormData({ ids: JSON.stringify(IDS) }));

		expect(mockUpdateProductReviewStats).not.toHaveBeenCalled();
	});

	it("logs audit with count and comma-separated ids", async () => {
		await bulkRestoreReviews(undefined, createMockFormData({ ids: JSON.stringify(IDS) }));

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "review.bulkRestore",
				targetType: "review",
				targetId: IDS.join(","),
				metadata: { count: 2 },
			}),
		);
	});

	it("invalidates cache for each restored review + admin list", async () => {
		await bulkRestoreReviews(undefined, createMockFormData({ ids: JSON.stringify(IDS) }));

		expect(mockGetReviewInvalidationTags).toHaveBeenCalledWith(PRODUCT_A, USER_ID, IDS[0]);
		expect(mockGetReviewInvalidationTags).toHaveBeenCalledWith(PRODUCT_B, USER_ID, IDS[1]);
		expect(mockUpdateTag).toHaveBeenCalledWith("reviews-admin-list");
	});

	it("skips cache invalidation for anonymized reviews (userId null)", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: IDS[0], productId: PRODUCT_A, userId: null },
		]);

		await bulkRestoreReviews(undefined, createMockFormData({ ids: JSON.stringify(IDS) }));

		expect(mockGetReviewInvalidationTags).not.toHaveBeenCalled();
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.productReview.findMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkRestoreReviews(
			undefined,
			createMockFormData({ ids: JSON.stringify(IDS) }),
		);
		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur restauration");
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
