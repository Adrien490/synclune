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
	mockSanitizeText,
	mockGetReviewInvalidationTags,
	mockUpdateProductReviewStats,
	mockDeleteUploadThingFiles,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		reviewMedia: {
			deleteMany: vi.fn(),
			createMany: vi.fn(),
		},
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
	mockSanitizeText: vi.fn(),
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
	notFound: mockNotFound,
	forbidden: mockForbidden,
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));
vi.mock("../../constants/cache", () => ({
	getReviewInvalidationTags: mockGetReviewInvalidationTags,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		NOT_OWNER: "Vous n'êtes pas l'auteur",
		UPDATE_FAILED: "Erreur modification",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	updateReviewSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../services/review-stats.service", () => ({
	updateProductReviewStats: mockUpdateProductReviewStats,
}));
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: mockDeleteUploadThingFiles,
}));

import { updateReview } from "../update-review";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_REVIEW_ID = VALID_CUID;
const VALID_PRODUCT_ID = "prod_cm1234567890abcde";

function makeReview(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_REVIEW_ID,
		userId: VALID_USER_ID,
		productId: VALID_PRODUCT_ID,
		medias: [] as { url: string }[],
		...overrides,
	};
}

const validFormData = createMockFormData({
	id: VALID_REVIEW_ID,
	rating: "5",
	title: "Titre",
	content: "Contenu avis",
	media: "[]",
});

// ============================================================================
// TESTS
// ============================================================================

describe("updateReview", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockGetReviewInvalidationTags.mockReturnValue(["tag-1", "tag-2"]);
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				id: VALID_REVIEW_ID,
				rating: 5,
				title: "Titre",
				content: "Contenu avis",
				media: [],
			},
		});
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview());
		mockPrisma.$transaction.mockImplementation((fn: Function) => fn(mockPrisma));
		mockPrisma.productReview.update.mockResolvedValue({
			id: VALID_REVIEW_ID,
			productId: VALID_PRODUCT_ID,
		});
		mockPrisma.reviewMedia.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.reviewMedia.createMany.mockResolvedValue({ count: 0 });
		mockUpdateProductReviewStats.mockResolvedValue(undefined);
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
		const result = await updateReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.productReview.findFirst).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de tentatives" },
		});
		const result = await updateReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.productReview.findFirst).not.toHaveBeenCalled();
	});

	it("should return validation error when safeParse fails with a field path", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ path: ["rating"], message: "Note invalide" }],
			},
		});
		const result = await updateReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockValidationError).toHaveBeenCalledWith("rating: Note invalide");
	});

	it("should return validation error using fallback message when path is empty", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ path: [], message: "Données requises" }],
			},
		});
		const result = await updateReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockValidationError).toHaveBeenCalledWith("Données requises");
	});

	it("should return not found when review does not exist", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(null);
		const result = await updateReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Avis");
	});

	it("should return forbidden when user is not the review owner", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ userId: "another-user-id" }));
		const result = await updateReview(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockForbidden).toHaveBeenCalledWith("Vous n'êtes pas l'auteur");
	});

	it("should update the review in a transaction on success", async () => {
		const result = await updateReview(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(mockPrisma.productReview.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_REVIEW_ID },
				data: expect.objectContaining({
					rating: 5,
					title: "Titre",
					content: "Contenu avis",
				}),
			}),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should sanitize title, content, and media altText", async () => {
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				id: VALID_REVIEW_ID,
				rating: 4,
				title: "  Mon titre  ",
				content: "  Mon contenu  ",
				media: [{ url: "https://utfs.io/f/file1.jpg", blurDataUrl: null, altText: "  Alt text  " }],
			},
		});
		mockSanitizeText.mockImplementation((t: string) => t.trim());

		await updateReview(undefined, validFormData);

		expect(mockSanitizeText).toHaveBeenCalledWith("  Mon titre  ");
		expect(mockSanitizeText).toHaveBeenCalledWith("  Mon contenu  ");
		expect(mockSanitizeText).toHaveBeenCalledWith("  Alt text  ");
	});

	it("should delete old medias and create new medias in transaction", async () => {
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				id: VALID_REVIEW_ID,
				rating: 5,
				title: "Titre",
				content: "Contenu avis",
				media: [
					{
						url: "https://utfs.io/f/new-file.jpg",
						blurDataUrl: "blur-hash",
						altText: "Nouveau media",
					},
				],
			},
		});

		await updateReview(undefined, validFormData);

		expect(mockPrisma.reviewMedia.deleteMany).toHaveBeenCalledWith({
			where: { reviewId: VALID_REVIEW_ID },
		});
		expect(mockPrisma.reviewMedia.createMany).toHaveBeenCalledWith({
			data: [
				{
					reviewId: VALID_REVIEW_ID,
					url: "https://utfs.io/f/new-file.jpg",
					blurDataUrl: "blur-hash",
					altText: "Nouveau media",
					position: 0,
				},
			],
		});
	});

	it("should update product review stats in the transaction", async () => {
		await updateReview(undefined, validFormData);
		expect(mockUpdateProductReviewStats).toHaveBeenCalledWith(mockPrisma, VALID_PRODUCT_ID);
	});

	it("should not update product review stats when productId is null", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ productId: null }));
		await updateReview(undefined, validFormData);
		expect(mockUpdateProductReviewStats).not.toHaveBeenCalled();
	});

	it("should invalidate cache tags after update", async () => {
		await updateReview(undefined, validFormData);
		expect(mockGetReviewInvalidationTags).toHaveBeenCalledWith(
			VALID_PRODUCT_ID,
			VALID_USER_ID,
			VALID_REVIEW_ID,
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("tag-2");
	});

	it("should fire-and-forget UploadThing cleanup only for removed URLs", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({
				medias: [
					{ url: "https://utfs.io/f/old-file.jpg" },
					{ url: "https://utfs.io/f/kept-file.jpg" },
				],
			}),
		);
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				id: VALID_REVIEW_ID,
				rating: 5,
				title: "Titre",
				content: "Contenu avis",
				media: [{ url: "https://utfs.io/f/kept-file.jpg", blurDataUrl: null, altText: null }],
			},
		});

		const result = await updateReview(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockDeleteUploadThingFiles).toHaveBeenCalledWith(["https://utfs.io/f/old-file.jpg"]);
	});

	it("should skip UploadThing cleanup when no URLs were removed", async () => {
		const sharedUrl = "https://utfs.io/f/shared-file.jpg";
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({ medias: [{ url: sharedUrl }] }),
		);
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				id: VALID_REVIEW_ID,
				rating: 5,
				title: "Titre",
				content: "Contenu avis",
				media: [{ url: sharedUrl, blurDataUrl: null, altText: null }],
			},
		});

		await updateReview(undefined, validFormData);

		expect(mockDeleteUploadThingFiles).not.toHaveBeenCalled();
	});

	it("should return success even when UploadThing cleanup fails (fire-and-forget)", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({ medias: [{ url: "https://utfs.io/f/old-file.jpg" }] }),
		);
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				id: VALID_REVIEW_ID,
				rating: 5,
				title: "Titre",
				content: "Contenu avis",
				media: [],
			},
		});
		mockDeleteUploadThingFiles.mockRejectedValue(new Error("UploadThing error"));

		const result = await updateReview(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await updateReview(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur modification");
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
