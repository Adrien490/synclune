import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_USER_ID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockSuccess,
	mockNotFound,
	mockValidationError,
	mockHandleActionError,
	mockGetReviewInvalidationTags,
	mockUpdateProductReviewStats,
	mockLogAudit,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findUnique: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
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
vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: mockLogAudit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_REVIEW_LIMITS: { RESTORE: "restore" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));
vi.mock("@/shared/lib/actions", () => ({
	success: mockSuccess,
	notFound: mockNotFound,
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../constants/cache", () => ({
	getReviewInvalidationTags: mockGetReviewInvalidationTags,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		RESTORE_FAILED: "Erreur restauration",
		NOT_DELETED: "Cet avis n'est pas supprimé",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	restoreReviewSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../services/review-stats.service", () => ({
	updateProductReviewStats: mockUpdateProductReviewStats,
}));

import { restoreReview } from "../restore-review";

// ============================================================================
// TESTS
// ============================================================================

const REVIEW_ID = VALID_CUID;
const PRODUCT_ID = "cm1111111111111111111111p";
const DELETED_AT = new Date("2026-04-10T00:00:00Z");

describe("restoreReview", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.fr" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeParse.mockReturnValue({ success: true, data: { id: REVIEW_ID } });

		mockPrisma.productReview.findUnique.mockResolvedValue({
			id: REVIEW_ID,
			productId: PRODUCT_ID,
			userId: VALID_USER_ID,
			deletedAt: DELETED_AT,
			status: "PUBLISHED",
		});

		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
			return fn({
				productReview: { update: vi.fn().mockResolvedValue({ id: REVIEW_ID }) },
			});
		});

		mockGetReviewInvalidationTags.mockReturnValue(["tag-a", "tag-b"]);
		mockLogAudit.mockResolvedValue(undefined);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockNotFound.mockImplementation((label: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${label} introuvable`,
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
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await restoreReview(undefined, createMockFormData({ id: REVIEW_ID }));
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.productReview.findUnique).not.toHaveBeenCalled();
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await restoreReview(undefined, createMockFormData({ id: REVIEW_ID }));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when schema fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ path: ["id"], message: "ID invalide" }] },
		});
		const result = await restoreReview(undefined, createMockFormData({ id: "bad" }));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns notFound when review doesn't exist", async () => {
		mockPrisma.productReview.findUnique.mockResolvedValue(null);
		const result = await restoreReview(undefined, createMockFormData({ id: REVIEW_ID }));
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("returns validation error when review is not soft-deleted", async () => {
		mockPrisma.productReview.findUnique.mockResolvedValue({
			id: REVIEW_ID,
			productId: PRODUCT_ID,
			userId: VALID_USER_ID,
			deletedAt: null,
			status: "PUBLISHED",
		});
		const result = await restoreReview(undefined, createMockFormData({ id: REVIEW_ID }));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockValidationError).toHaveBeenCalledWith("Cet avis n'est pas supprimé");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("restores review and recalculates stats in transaction", async () => {
		const txUpdate = vi.fn().mockResolvedValue({ id: REVIEW_ID });
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
			return fn({ productReview: { update: txUpdate } });
		});

		const result = await restoreReview(undefined, createMockFormData({ id: REVIEW_ID }));

		expect(txUpdate).toHaveBeenCalledWith({
			where: { id: REVIEW_ID },
			data: { deletedAt: null },
		});
		expect(mockUpdateProductReviewStats).toHaveBeenCalledWith(expect.anything(), PRODUCT_ID);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("skips stats recalc when productId is null (orphan)", async () => {
		mockPrisma.productReview.findUnique.mockResolvedValue({
			id: REVIEW_ID,
			productId: null,
			userId: VALID_USER_ID,
			deletedAt: DELETED_AT,
			status: "HIDDEN",
		});

		await restoreReview(undefined, createMockFormData({ id: REVIEW_ID }));

		expect(mockUpdateProductReviewStats).not.toHaveBeenCalled();
	});

	it("skips cache invalidation when userId is null (anonymized)", async () => {
		mockPrisma.productReview.findUnique.mockResolvedValue({
			id: REVIEW_ID,
			productId: PRODUCT_ID,
			userId: null,
			deletedAt: DELETED_AT,
			status: "PUBLISHED",
		});

		await restoreReview(undefined, createMockFormData({ id: REVIEW_ID }));

		expect(mockGetReviewInvalidationTags).not.toHaveBeenCalled();
		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("logs audit with previousDeletedAt and status", async () => {
		await restoreReview(undefined, createMockFormData({ id: REVIEW_ID }));

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "review.restore",
				targetType: "review",
				targetId: REVIEW_ID,
				metadata: {
					previousDeletedAt: DELETED_AT.toISOString(),
					status: "PUBLISHED",
				},
			}),
		);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.productReview.findUnique.mockRejectedValue(new Error("DB crash"));
		const result = await restoreReview(undefined, createMockFormData({ id: REVIEW_ID }));
		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur restauration");
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
