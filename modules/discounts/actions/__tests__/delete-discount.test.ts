import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockSoftDelete,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockNotFound,
	mockGetDiscountInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findUnique: vi.fn(),
		},
	},
	mockSoftDelete: {
		discount: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	softDelete: mockSoftDelete,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
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
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
}));

vi.mock("../../schemas/discount.schemas", () => ({
	deleteDiscountSchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { DELETE: "discount-delete" },
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		HAS_USAGES: "Ce code promo a déjà été utilisé et ne peut pas être supprimé",
		DELETE_FAILED: "Erreur lors de la suppression du code promo",
	},
}));

vi.mock("../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
}));

import { deleteDiscount } from "../delete-discount";

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

const validFormData = createFormData({ id: "disc-123" });

const discountWithNoUsages = {
	id: "disc-123",
	code: "PROMO20",
	_count: { usages: 0 },
};

const discountWithUsages = {
	id: "disc-123",
	code: "PROMO20",
	_count: { usages: 5 },
};

// ============================================================================
// TESTS
// ============================================================================

describe("deleteDiscount", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: admin authenticated
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: { id: "disc-123" } });

		// Default: discount exists with no usages
		mockPrisma.discount.findUnique.mockResolvedValue(discountWithNoUsages);

		// Default: soft delete succeeds
		mockSoftDelete.discount.mockResolvedValue(undefined);

		// Default: invalidation tags
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-PROMO20"]);

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

		const result = await deleteDiscount(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockSoftDelete.discount).not.toHaveBeenCalled();
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

		const result = await deleteDiscount(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockSoftDelete.discount).not.toHaveBeenCalled();
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

		const result = await deleteDiscount(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockSoftDelete.discount).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Existence check
	// ──────────────────────────────────────────────────────────────

	it("should return notFound when discount does not exist", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await deleteDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockSoftDelete.discount).not.toHaveBeenCalled();
	});

	it("should look up discount with usage count", async () => {
		await deleteDiscount(undefined, validFormData);

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith({
			where: { id: "disc-123" },
			select: {
				id: true,
				code: true,
				_count: { select: { usages: true } },
			},
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Usage guard
	// ──────────────────────────────────────────────────────────────

	it("should return error when discount has usages", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(discountWithUsages);

		const result = await deleteDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Ce code promo a déjà été utilisé et ne peut pas être supprimé");
		expect(mockSoftDelete.discount).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Soft deletion
	// ──────────────────────────────────────────────────────────────

	it("should call softDelete.discount with the discount id", async () => {
		await deleteDiscount(undefined, validFormData);

		expect(mockSoftDelete.discount).toHaveBeenCalledWith("disc-123");
	});

	it("should return success message with discount code", async () => {
		const result = await deleteDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe('Code promo "PROMO20" supprimé');
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate cache tags after soft deletion", async () => {
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-PROMO20"]);

		await deleteDiscount(undefined, validFormData);

		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("PROMO20");
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("discount-PROMO20");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockSoftDelete.discount.mockRejectedValue(new Error("DB connection failed"));

		const result = await deleteDiscount(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la suppression du code promo",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
