import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

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
	mockSafeParse,
	mockSanitizeText,
} = vi.hoisted(() => ({
	mockPrisma: {
		reviewResponse: { findFirst: vi.fn(), update: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockValidationError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetReviewModerationTags: vi.fn(),
	mockSafeParse: vi.fn(),
	mockSanitizeText: vi.fn(),
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
	ADMIN_REVIEW_LIMITS: { RESPONSE: "response" },
}));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	success: mockSuccess,
	notFound: mockNotFound,
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}));
vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
}));
vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));
vi.mock("../../constants/cache", () => ({
	REVIEWS_CACHE_TAGS: { ADMIN_LIST: "reviews-admin-list" },
	getReviewModerationTags: mockGetReviewModerationTags,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		RESPONSE_UPDATE_FAILED: "Erreur mise à jour réponse",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	updateReviewResponseSchema: { safeParse: mockSafeParse },
}));

import { updateReviewResponse } from "../update-review-response";

// ============================================================================
// HELPERS
// ============================================================================

const RESPONSE_ID = VALID_CUID;
const NEW_CONTENT = "Merci pour votre retour !";

function makeResponse(overrides: Record<string, unknown> = {}) {
	return {
		id: RESPONSE_ID,
		review: { id: "rev-1", productId: "prod-1" },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateReviewResponse", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeParse.mockReturnValue({
			success: true,
			data: { id: RESPONSE_ID, content: NEW_CONTENT },
		});
		mockPrisma.reviewResponse.findFirst.mockResolvedValue(makeResponse());
		mockPrisma.reviewResponse.update.mockResolvedValue({});
		mockSanitizeText.mockImplementation((text: string) => text);
		mockGetReviewModerationTags.mockReturnValue(["tag-1"]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
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
		const result = await updateReviewResponse(
			undefined,
			createMockFormData({ id: RESPONSE_ID, content: NEW_CONTENT }),
		);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await updateReviewResponse(
			undefined,
			createMockFormData({ id: RESPONSE_ID, content: NEW_CONTENT }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when schema fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ path: ["content"], message: "Contenu requis" }] },
		});
		const result = await updateReviewResponse(
			undefined,
			createMockFormData({ id: RESPONSE_ID, content: "" }),
		);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns notFound when response does not exist", async () => {
		mockPrisma.reviewResponse.findFirst.mockResolvedValue(null);
		const result = await updateReviewResponse(
			undefined,
			createMockFormData({ id: RESPONSE_ID, content: NEW_CONTENT }),
		);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("sanitizes content before update", async () => {
		mockSanitizeText.mockReturnValue("Sanitized content");

		await updateReviewResponse(
			undefined,
			createMockFormData({ id: RESPONSE_ID, content: NEW_CONTENT }),
		);

		expect(mockSanitizeText).toHaveBeenCalledWith(NEW_CONTENT);
		expect(mockPrisma.reviewResponse.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: RESPONSE_ID },
				data: { content: "Sanitized content" },
			}),
		);
	});

	it("invalidates moderation tags and admin list", async () => {
		await updateReviewResponse(
			undefined,
			createMockFormData({ id: RESPONSE_ID, content: NEW_CONTENT }),
		);

		expect(mockGetReviewModerationTags).toHaveBeenCalledWith("prod-1", "rev-1");
		expect(mockUpdateTag).toHaveBeenCalledWith("reviews-admin-list");
	});

	it("returns success on update", async () => {
		const result = await updateReviewResponse(
			undefined,
			createMockFormData({ id: RESPONSE_ID, content: NEW_CONTENT }),
		);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.reviewResponse.update.mockRejectedValue(new Error("DB crash"));
		const result = await updateReviewResponse(
			undefined,
			createMockFormData({ id: RESPONSE_ID, content: NEW_CONTENT }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
