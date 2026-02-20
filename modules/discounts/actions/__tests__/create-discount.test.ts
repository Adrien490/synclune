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
	mockSanitizeText,
	mockGetDiscountInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findUnique: vi.fn(),
			create: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockGetDiscountInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
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
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

vi.mock("../../schemas/discount.schemas", () => ({
	createDiscountSchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { CREATE: "discount-create" },
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		ALREADY_EXISTS: "Un code promo avec ce code existe déjà",
		CREATE_FAILED: "Erreur lors de la création du code promo",
	},
}));

vi.mock("../../constants/cache", () => ({
	getDiscountInvalidationTags: mockGetDiscountInvalidationTags,
}));

import { createDiscount } from "../create-discount";

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
	code: "PROMO20",
	type: "PERCENTAGE",
	value: "20",
});

const validatedData = {
	code: "PROMO20",
	type: "PERCENTAGE",
	value: 20,
	minOrderAmount: null,
	maxUsageCount: null,
	maxUsagePerUser: null,
	startsAt: null,
	endsAt: null,
};

// ============================================================================
// TESTS
// ============================================================================

describe("createDiscount", () => {
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

		// Default: code does not exist
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		// Default: create returns the discount
		mockPrisma.discount.create.mockResolvedValue({
			id: "disc-new",
			code: "PROMO20",
		});

		// Default: invalidation tags
		mockGetDiscountInvalidationTags.mockReturnValue([
			"discounts-list",
			"discount-PROMO20",
		]);

		// Default: success/error helpers return shaped ActionState
		mockSuccess.mockImplementation((message: string, data?: Record<string, unknown>) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockHandleActionError.mockImplementation(
			(_e: unknown, fallback: string) => ({
				status: ActionStatus.ERROR,
				message: fallback,
			})
		);
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

		const result = await createDiscount(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.discount.create).not.toHaveBeenCalled();
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

		const result = await createDiscount(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.discount.create).not.toHaveBeenCalled();
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

		const result = await createDiscount(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.discount.create).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Sanitization
	// ──────────────────────────────────────────────────────────────

	it("should sanitize code before persisting", async () => {
		mockSanitizeText.mockReturnValue("SANITIZED-CODE");

		await createDiscount(undefined, validFormData);

		expect(mockSanitizeText).toHaveBeenCalledWith("PROMO20");
		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith({
			where: { code: "SANITIZED-CODE" },
			select: { id: true },
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Uniqueness check
	// ──────────────────────────────────────────────────────────────

	it("should check if code already exists", async () => {
		await createDiscount(undefined, validFormData);

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith({
			where: { code: "PROMO20" },
			select: { id: true },
		});
	});

	it("should return ALREADY_EXISTS error when code exists", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "existing" });

		const result = await createDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(
			"Un code promo avec ce code existe déjà"
		);
		expect(mockPrisma.discount.create).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Creation
	// ──────────────────────────────────────────────────────────────

	it("should create discount with correct data", async () => {
		await createDiscount(undefined, validFormData);

		expect(mockPrisma.discount.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				code: "PROMO20",
				type: "PERCENTAGE",
				value: 20,
				isActive: true,
			}),
			select: { id: true, code: true },
		});
	});

	it("should set isActive to true on creation", async () => {
		await createDiscount(undefined, validFormData);

		expect(mockPrisma.discount.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ isActive: true }),
			})
		);
	});

	it("should default startsAt to new Date() when not provided", async () => {
		const beforeCreate = new Date();
		await createDiscount(undefined, validFormData);

		const createCall = mockPrisma.discount.create.mock.calls[0][0];
		const startsAt = createCall.data.startsAt;

		// startsAt should be a Date close to now (validatedData.startsAt is null → falls back to new Date())
		expect(startsAt).toBeInstanceOf(Date);
		expect(startsAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
	});

	it("should return success with discount id", async () => {
		const result = await createDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			'Code promo "PROMO20" créé avec succès',
			{ id: "disc-new" }
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate cache tags after creation", async () => {
		mockGetDiscountInvalidationTags.mockReturnValue([
			"discounts-list",
			"discount-PROMO20",
		]);

		await createDiscount(undefined, validFormData);

		expect(mockGetDiscountInvalidationTags).toHaveBeenCalledWith("PROMO20");
		expect(mockUpdateTag).toHaveBeenCalledWith("discounts-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("discount-PROMO20");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should return ALREADY_EXISTS on Prisma P2002 error", async () => {
		const prismaError = new Prisma.PrismaClientKnownRequestError(
			"Unique constraint failed",
			{ code: "P2002", clientVersion: "6.0.0" }
		);
		mockPrisma.discount.create.mockRejectedValue(prismaError);

		const result = await createDiscount(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(
			"Un code promo avec ce code existe déjà"
		);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.discount.create.mockRejectedValue(
			new Error("DB connection failed")
		);

		const result = await createDiscount(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de la création du code promo"
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
