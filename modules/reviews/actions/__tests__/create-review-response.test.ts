import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

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
	mockError,
	mockValidationError,
	mockHandleActionError,
	mockGetReviewModerationTags,
	mockSanitizeText,
	mockSendReviewResponseEmail,
	mockBuildUrl,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productReview: { findFirst: vi.fn() },
		reviewResponse: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockError: vi.fn(),
	mockValidationError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetReviewModerationTags: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockSendReviewResponseEmail: vi.fn(),
	mockBuildUrl: vi.fn(),
	mockSafeParse: vi.fn(),
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
	ADMIN_REVIEW_LIMITS: { RESPONSE: "response" },
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
	error: mockError,
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));
vi.mock("@/modules/emails/services/review-emails", () => ({
	sendReviewResponseEmail: mockSendReviewResponseEmail,
}));
vi.mock("@/shared/constants/urls", () => ({
	buildUrl: mockBuildUrl,
	ROUTES: {
		SHOP: {
			PRODUCT: (slug: string) => `/boutique/${slug}`,
		},
	},
}));
vi.mock("../../constants/cache", () => ({
	getReviewModerationTags: mockGetReviewModerationTags,
	REVIEWS_CACHE_TAGS: { ADMIN_LIST: "reviews-admin-list" },
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		RESPONSE_ALREADY_EXISTS: "Une réponse existe déjà",
		RESPONSE_CREATE_FAILED: "Erreur création réponse",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	createReviewResponseSchema: { safeParse: mockSafeParse },
}));

import { createReviewResponse } from "../create-review-response";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_REVIEW_ID = VALID_CUID;
const VALID_PRODUCT_ID = "prod_cm1234567890abcde";
const ADMIN_ID = "admin_cm1234567890abcde";

const validFormData = createMockFormData({
	reviewId: VALID_REVIEW_ID,
	content: "Merci pour votre avis, nous en prenons note !",
});

function makeAdmin(overrides: Record<string, unknown> = {}) {
	return {
		user: {
			id: ADMIN_ID,
			name: "Admin Synclune",
			email: "admin@synclune.fr",
			...overrides,
		},
	};
}

function makeReview(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_REVIEW_ID,
		productId: VALID_PRODUCT_ID,
		content: "Super produit, très belle qualité !",
		response: null,
		user: {
			email: "client@example.com",
			name: "Marie Dupont",
		},
		product: {
			title: "Bracelet Lune",
			slug: "bracelet-lune",
		},
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("createReviewResponse", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue(makeAdmin());
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				reviewId: VALID_REVIEW_ID,
				content: "Merci pour votre avis, nous en prenons note !",
			},
		});
		mockSanitizeText.mockImplementation((text: string) => text);
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview());
		mockPrisma.reviewResponse.create.mockResolvedValue({ id: "response-1" });
		mockGetReviewModerationTags.mockReturnValue(["mod-tag-1", "mod-tag-2"]);
		mockBuildUrl.mockReturnValue("https://synclune.fr/boutique/bracelet-lune");
		mockSendReviewResponseEmail.mockResolvedValue(undefined);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
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

	it("should return auth error when user is not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.productReview.findFirst).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limit is exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de tentatives" },
		});
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.productReview.findFirst).not.toHaveBeenCalled();
	});

	it("should return validation error when safeParse fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ path: ["content"], message: "Contenu trop court" }],
			},
		});
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockValidationError).toHaveBeenCalledWith("content: Contenu trop court");
	});

	it("should return validation error using fallback message when path is empty", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: {
				issues: [{ path: [], message: "Champs requis" }],
			},
		});
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockValidationError).toHaveBeenCalledWith("Champs requis");
	});

	it("should return not found when review does not exist", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(null);
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Avis");
	});

	it("should return error when review is an orphan (no product)", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({ productId: null, product: null }),
		);
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(
			"Impossible de répondre à cet avis (produit ou utilisateur supprimé)",
		);
	});

	it("should return error when review is an orphan (no user)", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(makeReview({ user: null }));
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith(
			"Impossible de répondre à cet avis (produit ou utilisateur supprimé)",
		);
	});

	it("should return error when review already has a response", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({ response: { id: "existing-response-id" } }),
		);
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Une réponse existe déjà");
	});

	it("should create response with sanitized content", async () => {
		mockSanitizeText.mockReturnValue("Contenu sanitisé");
		mockSafeParse.mockReturnValue({
			success: true,
			data: {
				reviewId: VALID_REVIEW_ID,
				content: "Contenu brut <script>alert(1)</script>",
			},
		});
		await createReviewResponse(undefined, validFormData);
		expect(mockSanitizeText).toHaveBeenCalledWith("Contenu brut <script>alert(1)</script>");
		expect(mockPrisma.reviewResponse.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					content: "Contenu sanitisé",
				}),
			}),
		);
	});

	it("should create response with correct reviewId, authorId and authorName", async () => {
		await createReviewResponse(undefined, validFormData);
		expect(mockPrisma.reviewResponse.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					reviewId: VALID_REVIEW_ID,
					authorId: ADMIN_ID,
					authorName: "Admin Synclune",
				}),
			}),
		);
	});

	it("should use Synclune as authorName when admin has no name", async () => {
		mockRequireAdminWithUser.mockResolvedValue(makeAdmin({ name: null }));
		await createReviewResponse(undefined, validFormData);
		expect(mockPrisma.reviewResponse.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ authorName: "Synclune" }),
			}),
		);
	});

	it("should invalidate cache tags after creating response", async () => {
		await createReviewResponse(undefined, validFormData);
		expect(mockGetReviewModerationTags).toHaveBeenCalledWith(VALID_PRODUCT_ID, VALID_REVIEW_ID);
		expect(mockUpdateTag).toHaveBeenCalledWith("mod-tag-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("mod-tag-2");
		expect(mockUpdateTag).toHaveBeenCalledWith("reviews-admin-list");
	});

	it("should send notification email to customer as fire-and-forget", async () => {
		await createReviewResponse(undefined, validFormData);
		expect(mockSendReviewResponseEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "client@example.com",
				customerName: "Marie",
				productTitle: "Bracelet Lune",
			}),
		);
	});

	it("should use first name only when sending email", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({ user: { email: "client@example.com", name: "Marie Dupont" } }),
		);
		await createReviewResponse(undefined, validFormData);
		expect(mockSendReviewResponseEmail).toHaveBeenCalledWith(
			expect.objectContaining({ customerName: "Marie" }),
		);
	});

	it("should use Cliente as customerName fallback when user has no name", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({ user: { email: "client@example.com", name: null } }),
		);
		await createReviewResponse(undefined, validFormData);
		expect(mockSendReviewResponseEmail).toHaveBeenCalledWith(
			expect.objectContaining({ customerName: "Cliente" }),
		);
	});

	it("should skip email when customer has no email", async () => {
		mockPrisma.productReview.findFirst.mockResolvedValue(
			makeReview({ user: { email: null, name: "Marie Dupont" } }),
		);
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSendReviewResponseEmail).not.toHaveBeenCalled();
	});

	it("should return success even when email sending fails (fire-and-forget)", async () => {
		mockSendReviewResponseEmail.mockRejectedValue(new Error("Email error"));
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return success with response id in data", async () => {
		mockPrisma.reviewResponse.create.mockResolvedValue({ id: "response-42" });
		const result = await createReviewResponse(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Réponse publiée avec succès", { id: "response-42" });
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.reviewResponse.create.mockRejectedValue(new Error("DB crash"));
		const result = await createReviewResponse(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur création réponse",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
