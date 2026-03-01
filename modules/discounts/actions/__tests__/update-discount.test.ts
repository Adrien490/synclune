import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockNotFound,
	mockSanitizeText,
	mockGetDiscountInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("../../schemas/discount.schemas", () => ({
	updateDiscountSchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { UPDATE: "discount-update" },
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		ALREADY_EXISTS: "Un code promo avec ce code existe déjà",
		UPDATE_FAILED: "Erreur lors de la modification du code promo",
	},
}));

vi.mock("../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
	DISCOUNT_CACHE_TAGS: {
		DETAIL: (code: string) => `discount-${code}`,
	},
}));

import { updateDiscount } from "../update-discount";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(data: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(data)) {
		formData.set(key, value);
	}
	return formData;
}

const validFormData = createFormData({
	id: "disc-123",
	code: "PROMO20",
	type: "PERCENTAGE",
	value: "20",
});

const validatedData = {
	id: "disc-123",
	code: "PROMO20",
	type: "PERCENTAGE",
	value: 20,
	minOrderAmount: null,
	maxUsageCount: null,
	maxUsagePerUser: null,
	startsAt: null,
	endsAt: null,
};

const existingDiscount = {
	id: "disc-123",
	code: "PROMO20",
};

// ============================================================================
// TESTS
// ============================================================================

describe("updateDiscount", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: admin authenticated
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });

		// Default: sanitizeText passes through
		mockSanitizeText.mockImplementation((text: string) => text);

		// Default: discount exists
		mockPrisma.discount.findUnique.mockResolvedValue(existingDiscount);

		// Default: no code conflict
		mockPrisma.discount.findFirst.mockResolvedValue(null);

		// Default: update succeeds
		mockPrisma.discount.update.mockResolvedValue({ id: "disc-123", code: "PROMO20" });

		// Default: invalidation tags
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-disc-123"]);

		// Default: success/error/notFound helpers return shaped ActionState
		mockSuccess.mockImplementation((message: string, data?: Record<string, unknown>) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = {
			status: ActionStatus.UNAUTHORIZED,
			message: "Non autorisé",
		};
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await updateDiscount(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limit
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = {
			status: ActionStatus.ERROR,
			message: "Trop de requêtes",
		};
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateDiscount(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid data", async () => {
		const validationError = {
			status: ActionStatus.VALIDATION_ERROR,
			message: "Données invalides",
		};
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await updateDiscount(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Existence check
	// ──────────────────────────────────────────────────────────────

	it("should return notFound when discount does not exist", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await updateDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("should check existence using id and notDeleted filter", async () => {
		await updateDiscount(undefined, validFormData);

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith({
			where: { id: "disc-123", deletedAt: null },
			select: { id: true, code: true },
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Uniqueness check
	// ──────────────────────────────────────────────────────────────

	it("should skip uniqueness check when code is unchanged", async () => {
		// sanitizedCode === existing.code → no findFirst call
		mockSanitizeText.mockReturnValue("PROMO20");
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "disc-123", code: "PROMO20" });

		await updateDiscount(undefined, validFormData);

		expect(mockPrisma.discount.findFirst).not.toHaveBeenCalled();
	});

	it("should check uniqueness when code is changed", async () => {
		mockSanitizeText.mockReturnValue("NEWCODE");
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "disc-123", code: "PROMO20" });

		await updateDiscount(undefined, validFormData);

		expect(mockPrisma.discount.findFirst).toHaveBeenCalledWith({
			where: { code: "NEWCODE", deletedAt: null },
			select: { id: true },
		});
	});

	it("should return ALREADY_EXISTS error when new code conflicts with existing discount", async () => {
		mockSanitizeText.mockReturnValue("TAKEN");
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "disc-123", code: "PROMO20" });
		mockPrisma.discount.findFirst.mockResolvedValue({ id: "other-disc" });

		const result = await updateDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Un code promo avec ce code existe déjà");
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Update
	// ──────────────────────────────────────────────────────────────

	it("should update discount with sanitized code and validated data", async () => {
		mockSanitizeText.mockReturnValue("PROMO20-SANITIZED");
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "disc-123", code: "PROMO20" });
		mockPrisma.discount.findFirst.mockResolvedValue(null);

		await updateDiscount(undefined, validFormData);

		expect(mockPrisma.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-123" },
			data: expect.objectContaining({
				code: "PROMO20-SANITIZED",
				type: "PERCENTAGE",
				value: 20,
			}),
		});
	});

	it("should return success message with sanitized code", async () => {
		const result = await updateDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe('Code promo "PROMO20" mis à jour');
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate cache tags for id and old code after update", async () => {
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-disc-123"]);

		await updateDiscount(undefined, validFormData);

		// id-based invalidation
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("disc-123");
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("discount-disc-123");

		// old code always invalidated via DISCOUNT_CACHE_TAGS.DETAIL
		expect(mockUpdateTag).toHaveBeenCalledWith("discount-PROMO20");
	});

	it("should also invalidate new code tags when code changed", async () => {
		mockSanitizeText.mockReturnValue("UPDATED-CODE");
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "disc-123", code: "OLD-CODE" });
		mockPrisma.discount.findFirst.mockResolvedValue(null);
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-detail"]);

		await updateDiscount(undefined, validFormData);

		// Called for id and then for new code
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("disc-123");
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("UPDATED-CODE");
	});

	it("should not call getDiscountInvalidationTags for new code when code is unchanged", async () => {
		mockSanitizeText.mockReturnValue("PROMO20");
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "disc-123", code: "PROMO20" });

		await updateDiscount(undefined, validFormData);

		// Only called once (for id), not a second time for unchanged code
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledTimes(1);
		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("disc-123");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should return ALREADY_EXISTS on Prisma P2002 error", async () => {
		const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
			code: "P2002",
			clientVersion: "6.0.0",
		});
		mockPrisma.discount.update.mockRejectedValue(prismaError);

		const result = await updateDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Un code promo avec ce code existe déjà");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.discount.update.mockRejectedValue(new Error("DB connection failed"));

		const result = await updateDiscount(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la modification du code promo",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
