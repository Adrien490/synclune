import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockLogAudit,
	mockRecomputeBatch,
	mockSuccess,
	mockError,
	mockHandleActionError,
	mockValidateInput,
	mockParseFormIds,
	mockSafeFormGet,
	mockGetReviewModerationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockLogAudit: vi.fn(),
	mockRecomputeBatch: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockValidateInput: vi.fn(),
	mockParseFormIds: vi.fn(),
	mockSafeFormGet: vi.fn(),
	mockGetReviewModerationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_REVIEW_LIMITS: { MODERATE: "admin-review-moderate" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/shared/lib/actions", () => ({
	parseFormIds: mockParseFormIds,
	safeFormGet: mockSafeFormGet,
	success: mockSuccess,
	error: mockError,
	handleActionError: mockHandleActionError,
	validateInput: mockValidateInput,
}));
vi.mock("@/app/generated/prisma/client", () => ({
	ReviewStatus: { PUBLISHED: "PUBLISHED", HIDDEN: "HIDDEN" },
}));
vi.mock("../../constants/cache", () => ({
	getReviewModerationTags: mockGetReviewModerationTags,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: { MODERATE_FAILED: "Erreur" },
}));
vi.mock("../../schemas/review.schemas", () => ({
	bulkModerateReviewsSchema: {},
}));
vi.mock("../../services/review-stats.service", () => ({
	recomputeProductReviewStatsBatch: mockRecomputeBatch,
}));

import { bulkModerateReviews } from "../bulk-moderate-reviews";

// ============================================================================
// HELPERS
// ============================================================================

function makeFormData(): FormData {
	const fd = new FormData();
	fd.append("reviewIds", '["rev-1","rev-2"]');
	fd.append("targetStatus", "HIDDEN");
	return fd;
}

function setupHappyPath() {
	mockRequireAdminWithUser.mockResolvedValue({
		user: { id: "admin-1", name: "Admin", email: "a@b.c" },
	});
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockParseFormIds.mockReturnValue({ ids: ["rev-1", "rev-2"] });
	mockSafeFormGet.mockReturnValue("HIDDEN");
	mockValidateInput.mockReturnValue({
		data: { reviewIds: ["rev-1", "rev-2"], targetStatus: "HIDDEN" },
	});
	mockPrisma.productReview.findMany.mockResolvedValue([
		{ id: "rev-1", productId: "prod-A", status: "PUBLISHED" },
		{ id: "rev-2", productId: "prod-B", status: "PUBLISHED" },
	]);
	mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
		return fn(mockPrisma);
	});
	mockPrisma.productReview.updateMany.mockResolvedValue({ count: 2 });
	mockGetReviewModerationTags.mockReturnValue([]);
	mockSuccess.mockImplementation((message: string, data: unknown) => ({
		status: ActionStatus.SUCCESS,
		message,
		data,
	}));
	mockError.mockImplementation((message: string) => ({ status: ActionStatus.ERROR, message }));
	mockRecomputeBatch.mockResolvedValue(undefined);
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkModerateReviews", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		setupHappyPath();
	});

	it("calls recomputeProductReviewStatsBatch once with all unique productIds", async () => {
		await bulkModerateReviews(undefined, makeFormData());

		expect(mockRecomputeBatch).toHaveBeenCalledTimes(1);
		expect(mockRecomputeBatch).toHaveBeenCalledWith(
			mockPrisma,
			expect.arrayContaining(["prod-A", "prod-B"]),
		);
	});

	it("dedupes productIds before calling recomputeProductReviewStatsBatch", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: "rev-1", productId: "prod-A", status: "PUBLISHED" },
			{ id: "rev-2", productId: "prod-A", status: "PUBLISHED" },
			{ id: "rev-3", productId: "prod-B", status: "PUBLISHED" },
		]);
		mockParseFormIds.mockReturnValue({ ids: ["rev-1", "rev-2", "rev-3"] });
		mockValidateInput.mockReturnValue({
			data: { reviewIds: ["rev-1", "rev-2", "rev-3"], targetStatus: "HIDDEN" },
		});

		await bulkModerateReviews(undefined, makeFormData());

		const args = mockRecomputeBatch.mock.calls[0]?.[1] as string[];
		expect(args).toHaveLength(2);
		expect(new Set(args)).toEqual(new Set(["prod-A", "prod-B"]));
	});

	it("excludes archived (productId null) reviews from recompute batch", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: "rev-1", productId: "prod-A", status: "PUBLISHED" },
			{ id: "rev-2", productId: null, status: "PUBLISHED" },
		]);

		await bulkModerateReviews(undefined, makeFormData());

		expect(mockRecomputeBatch).toHaveBeenCalledWith(mockPrisma, ["prod-A"]);
	});

	it("logs audit with bulk:count targetId (not concatenated cuid list)", async () => {
		await bulkModerateReviews(undefined, makeFormData());

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "review.bulkHide",
				targetType: "review",
				targetId: "bulk:2",
				metadata: expect.objectContaining({
					count: 2,
					reviewIds: ["rev-1", "rev-2"],
				}),
			}),
		);
	});

	it("returns error when no eligible reviews", async () => {
		mockPrisma.productReview.findMany.mockResolvedValue([
			{ id: "rev-1", productId: "prod-A", status: "HIDDEN" },
			{ id: "rev-2", productId: "prod-B", status: "HIDDEN" },
		]);

		const result = await bulkModerateReviews(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockRecomputeBatch).not.toHaveBeenCalled();
	});
});
