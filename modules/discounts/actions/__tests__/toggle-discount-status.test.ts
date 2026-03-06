import { describe, it, expect, vi, beforeEach } from "vitest";
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
	mockNotFound,
	mockGetDiscountInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
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
	notFound: mockNotFound,
}));

vi.mock("../../schemas/discount.schemas", () => ({
	toggleDiscountStatusSchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { TOGGLE_STATUS: "discount-toggle" },
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		UPDATE_FAILED: "Erreur lors de la modification du code promo",
	},
}));

vi.mock("../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
}));

import { toggleDiscountStatus } from "../toggle-discount-status";

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

const activeDiscount = {
	id: "disc-123",
	code: "PROMO20",
	isActive: true,
};

const inactiveDiscount = {
	id: "disc-123",
	code: "PROMO20",
	isActive: false,
};

// ============================================================================
// TESTS
// ============================================================================

describe("toggleDiscountStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: admin authenticated
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: { id: "disc-123" } });

		// Default: active discount exists
		mockPrisma.discount.findUnique.mockResolvedValue(activeDiscount);

		// Default: update succeeds
		mockPrisma.discount.update.mockResolvedValue({ id: "disc-123", isActive: false });

		// Default: invalidation tags
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-PROMO20"]);

		// Default: success/notFound helpers return shaped ActionState
		mockSuccess.mockImplementation((message: string, data?: Record<string, unknown>) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
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

		const result = await toggleDiscountStatus(undefined, validFormData);

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

		const result = await toggleDiscountStatus(undefined, validFormData);

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

		const result = await toggleDiscountStatus(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Existence check
	// ──────────────────────────────────────────────────────────────

	it("should return notFound when discount does not exist", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await toggleDiscountStatus(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.discount.update).not.toHaveBeenCalled();
	});

	it("should fetch discount with id and notDeleted filter", async () => {
		await toggleDiscountStatus(undefined, validFormData);

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith({
			where: { id: "disc-123", deletedAt: null },
			select: { id: true, code: true, isActive: true },
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Toggle logic
	// ──────────────────────────────────────────────────────────────

	it("should toggle active discount to inactive", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(activeDiscount);

		await toggleDiscountStatus(undefined, validFormData);

		expect(mockPrisma.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-123" },
			data: { isActive: false, manuallyDeactivated: true },
		});
	});

	it("should toggle inactive discount to active", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(inactiveDiscount);

		await toggleDiscountStatus(undefined, validFormData);

		expect(mockPrisma.discount.update).toHaveBeenCalledWith({
			where: { id: "disc-123" },
			data: { isActive: true, manuallyDeactivated: false },
		});
	});

	it("should return deactivated message when toggling active to inactive", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(activeDiscount);

		const result = await toggleDiscountStatus(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe('Code promo "PROMO20" désactivé');
	});

	it("should return activated message when toggling inactive to active", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(inactiveDiscount);

		const result = await toggleDiscountStatus(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toBe('Code promo "PROMO20" activé');
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate cache tags after toggling status", async () => {
		mockGetDiscountInvalidationTags.mockReturnValue(["discounts-list", "discount-PROMO20"]);

		await toggleDiscountStatus(undefined, validFormData);

		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("PROMO20");
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("discount-PROMO20");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.discount.update.mockRejectedValue(new Error("DB connection failed"));

		const result = await toggleDiscountStatus(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la modification du code promo",
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
