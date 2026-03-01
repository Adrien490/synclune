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
	mockNotFound,
	mockForbidden,
	mockValidationError,
	mockHandleActionError,
	mockGetReviewInvalidationTags,
	mockUpdateProductReviewStats,
	mockDeleteUploadThingFiles,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findFirst: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockForbidden: vi.fn(),
	mockValidationError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetReviewInvalidationTags: vi.fn(),
	mockUpdateProductReviewStats: vi.fn(),
	mockDeleteUploadThingFiles: vi.fn(),
	mockSafeParse: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAuth: mockRequireAuth,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	PRODUCT_LIMITS: { REVIEW: "review" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	success: mockSuccess,
	notFound: mockNotFound,
	forbidden: mockForbidden,
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../constants/cache", () => ({
	getReviewInvalidationTags: mockGetReviewInvalidationTags,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		NOT_OWNER: "Vous n'êtes pas l'auteur",
		DELETE_FAILED: "Erreur suppression",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	deleteReviewSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../services/review-stats.service", () => ({
	updateProductReviewStats: mockUpdateProductReviewStats,
}));
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: mockDeleteUploadThingFiles,
}));

import { deleteReview } from "../delete-review";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_REVIEW_ID = VALID_CUID;
const VALID_PRODUCT_ID = "prod_cm1234567890abcde";

const validFormData = createMockFormData({ id: VALID_REVIEW_ID });

function makeReview(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_REVIEW_ID,
		userId: VALID_USER_ID,
		productId: VALID_PRODUCT_ID,
		medias: [] as { url: string }[],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("deleteReview", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeParse.mockReturnValue({ success: true, data: { id: VALID_REVIEW_ID } });
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview());
		mockPrisma.$transaction.mockImplementation((fn: Function) => fn(mockPrisma));
		mockPrisma.productReview.update.mockResolvedValue({});
		mockUpdateProductReviewStats.mockResolvedValue(undefined);
		mockGetReviewInvalidationTags.mockReturnValue(["tag-1", "tag-2"]);
		mockDeleteUploadThingFiles.mockResolvedValue(undefined);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
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

	it("should return auth error when user is not authenticated", async () => {
		mockRequireAuth.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non authentifié" },
		});
		const result = await deleteReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.productReview.findFirst).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de tentatives" },
		});
		const result = await deleteReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.productReview.findFirst).not.toHaveBeenCalled();
	});

	it("should return validation error when safeParse fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ path: ["id"], message: "ID invalide" }],
			},
		});
		const result = await deleteReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockValidationError).toHaveBeenCalledWith("id: ID invalide");
	});

	it("should return validation error using fallback message when path is empty", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ path: [], message: "ID requis" }],
			},
		});
		const result = await deleteReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockValidationError).toHaveBeenCalledWith("ID requis");
	});

	it("should return not found when review does not exist", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(null);
		const result = await deleteReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Avis");
	});

	it("should return forbidden when user is not the review owner", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ userId: "another-user-id" }));
		const result = await deleteReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockForbidden).toHaveBeenCalledWith("Vous n'êtes pas l'auteur");
	});

	it("should soft delete the review in a transaction on success", async () => {
		const result = await deleteReview(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(mockPrisma.productReview.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_REVIEW_ID },
				data: expect.objectContaining({ deletedAt: expect.any(Date) }),
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should update product review stats in the transaction", async () => {
		await deleteReview(undefined, validFormData);
		expect(mockUpdateProductReviewStats).toHaveBeenCalledWith(mockPrisma, VALID_PRODUCT_ID);
	});

	it("should not update product review stats when productId is null", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ productId: null }));
		await deleteReview(undefined, validFormData);
		expect(mockUpdateProductReviewStats).not.toHaveBeenCalled();
	});

	it("should invalidate cache tags after deletion", async () => {
		await deleteReview(undefined, validFormData);
		expect(mockGetReviewInvalidationTags).toHaveBeenCalledWith(
			VALID_PRODUCT_ID,
			VALID_USER_ID,
			VALID_REVIEW_ID,
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-2");
	});

	it("should fire-and-forget UploadThing cleanup when medias exist", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({
				medias: [{ url: "https://utfs.io/f/file1.jpg" }, { url: "https://utfs.io/f/file2.jpg" }],
			}),
		);
		const result = await deleteReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		// fire-and-forget: called without awaiting, so we verify it was called
		expect(mockDeleteUploadThingFiles).toHaveBeenCalledWith([
			"https://utfs.io/f/file1.jpg",
			"https://utfs.io/f/file2.jpg",
		]);
	});

	it("should skip UploadThing cleanup when review has no medias", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ medias: [] }));
		await deleteReview(undefined, validFormData);
		expect(mockDeleteUploadThingFiles).not.toHaveBeenCalled();
	});

	it("should return success even when UploadThing cleanup fails (fire-and-forget)", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({ medias: [{ url: "https://utfs.io/f/file.jpg" }] }),
		);
		mockDeleteUploadThingFiles.mockRejectedValue(new Error("UploadThing error"));
		const result = await deleteReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await deleteReview(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur suppression");
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
