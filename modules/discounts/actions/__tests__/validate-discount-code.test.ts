import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as DiscountConstantsModule from "../../constants/discount.constants";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockHeaders,
	mockGetClientIp,
	mockEnforceRateLimit,
	mockGetSession,
	mockCheckDiscountEligibility,
	mockCalculateDiscountWithExclusion,
	mockGetDiscountUsageCounts,
	mockGetCart,
	mockAjDiscountValidation,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findUnique: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockGetSession: vi.fn(),
	mockCheckDiscountEligibility: vi.fn(),
	mockCalculateDiscountWithExclusion: vi.fn(),
	mockGetDiscountUsageCounts: vi.fn(),
	mockGetCart: vi.fn(),
	mockAjDiscountValidation: {
		protect: vi.fn(),
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	getClientIp: mockGetClientIp,
}));

vi.mock("@/shared/lib/actions/rate-limit", () => ({
	enforceRateLimit: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	PAYMENT_LIMITS: { VALIDATE_DISCOUNT: "validate-discount" },
}));

vi.mock("@/shared/lib/arcjet", () => ({
	ajDiscountValidation: mockAjDiscountValidation,
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/data/get-cart", () => ({
	getCart: mockGetCart,
}));

vi.mock("../../services/discount-eligibility.service", () => ({
	checkDiscountEligibility: mockCheckDiscountEligibility,
}));

vi.mock("../../services/discount-calculation.service", () => ({
	calculateDiscountWithExclusion: mockCalculateDiscountWithExclusion,
}));

vi.mock("../../data/get-discount-usage-counts", () => ({
	getDiscountUsageCounts: mockGetDiscountUsageCounts,
}));

vi.mock("../../constants/discount.constants", async (importOriginal) => {
	const actual = await importOriginal<typeof DiscountConstantsModule>();
	return {
		...actual,
		GET_DISCOUNT_VALIDATION_SELECT: { id: true },
	};
});

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

import { validateDiscountCode } from "../validate-discount-code";

// ============================================================================
// HELPERS
// ============================================================================

const VALID_CODE = "PROMO20";
const VALID_SUBTOTAL = 5000; // 50EUR in cents (passed but ignored)

const mockDiscount = {
	id: "disc-123",
	code: "PROMO20",
	type: "PERCENTAGE",
	value: 20,
	minOrderAmount: null,
	maxUsageCount: null,
	maxUsagePerUser: null,
	usageCount: 0,
	isActive: true,
	startsAt: new Date("2024-01-01"),
	endsAt: null,
};

const mockCart = {
	id: "cart-1",
	userId: null,
	sessionId: "sess-1",
	expiresAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	items: [
		{
			id: "item-1",
			quantity: 2,
			priceAtAdd: 2500,
			createdAt: new Date(),
			updatedAt: new Date(),
			sku: {
				id: "sku-1",
				sku: "SKU-001",
				priceInclTax: 2500,
				compareAtPrice: null,
				inventory: 10,
				isActive: true,
				product: { id: "prod-1", title: "Bague", slug: "bague", status: "PUBLISHED" },
				images: [],
				color: null,
				material: null,
				size: null,
			},
		},
	],
};

// ============================================================================
// TESTS
// ============================================================================

describe("validateDiscountCode", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: headers available
		mockHeaders.mockResolvedValue(new Headers());

		// Default: IP resolved
		mockGetClientIp.mockResolvedValue("192.168.1.1");

		// Default: Arcjet allows
		mockAjDiscountValidation.protect.mockResolvedValue({
			isDenied: () => false,
		});

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: no session (guest checkout)
		mockGetSession.mockResolvedValue(null);

		// Default: cart with items (subtotal = 5000)
		mockGetCart.mockResolvedValue(mockCart);

		// Default: discount found
		mockPrisma.discount.findUnique.mockResolvedValue(mockDiscount);

		// Default: eligible
		mockCheckDiscountEligibility.mockReturnValue({ eligible: true });

		// Default: calculated amount
		mockCalculateDiscountWithExclusion.mockReturnValue(1000);

		// Default: usage counts
		mockGetDiscountUsageCounts.mockResolvedValue({
			userCount: 0,
			emailCount: 0,
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	it("should return error when Arcjet denies", async () => {
		mockAjDiscountValidation.protect.mockResolvedValue({
			isDenied: () => true,
		});

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toContain("Trop de tentatives");
	});

	it("should return error when in-memory rate limited", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: "ERROR", message: "Rate limited" },
		});

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toContain("Trop de tentatives");
	});

	it("should use IP for rate limiting", async () => {
		mockGetClientIp.mockResolvedValue("10.0.0.1");

		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockEnforceRateLimit).toHaveBeenCalledWith(
			"ip:10.0.0.1",
			"validate-discount",
			"10.0.0.1",
		);
	});

	it("should use 'unknown' IP when getClientIp returns null", async () => {
		mockGetClientIp.mockResolvedValue(null);

		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockEnforceRateLimit).toHaveBeenCalledWith("ip:unknown", "validate-discount", "unknown");
	});

	// ──────────────────────────────────────────────────────────────
	// Server-side subtotal (P1 fix)
	// ──────────────────────────────────────────────────────────────

	it("should compute subtotal from server-side cart, not from client parameter", async () => {
		// Client passes a fake high subtotal
		await validateDiscountCode(VALID_CODE, 999999);

		// checkDiscountEligibility should receive the real cart subtotal (2*2500 = 5000)
		expect(mockCheckDiscountEligibility).toHaveBeenCalledWith(
			mockDiscount,
			expect.objectContaining({ subtotal: 5000 }),
			undefined,
		);
	});

	it("should return error when cart is empty", async () => {
		mockGetCart.mockResolvedValue({ ...mockCart, items: [] });

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Votre panier est vide");
	});

	it("should return error when cart is null", async () => {
		mockGetCart.mockResolvedValue(null);

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Votre panier est vide");
	});

	// ──────────────────────────────────────────────────────────────
	// Input validation
	// ──────────────────────────────────────────────────────────────

	it("should return error for invalid code format", async () => {
		const result = await validateDiscountCode("AB", VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Format de code invalide");
	});

	it("should normalize code to uppercase", async () => {
		await validateDiscountCode("promo20", VALID_SUBTOTAL);

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { code: "PROMO20", deletedAt: null },
			}),
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Retry path
	// ──────────────────────────────────────────────────────────────

	it("should retry without userId when userId validation fails", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "not-a-cuid2", email: "user@test.com" },
		});

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(true);
		expect(mockPrisma.discount.findUnique).toHaveBeenCalled();
	});

	it("should return error for invalid customerEmail", async () => {
		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL, "not-an-email");

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Adresse email invalide");
	});

	it("should preserve customerEmail in retry when userId fails", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "not-a-cuid2", email: "valid@test.com" },
		});

		const discountWithPerUser = {
			...mockDiscount,
			maxUsagePerUser: 1,
		};
		mockPrisma.discount.findUnique.mockResolvedValue(discountWithPerUser);

		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockGetDiscountUsageCounts).toHaveBeenCalledWith(
			expect.objectContaining({
				customerEmail: "valid@test.com",
			}),
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Discount lookup
	// ──────────────────────────────────────────────────────────────

	it("should return error when discount not found", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Code promo introuvable");
	});

	it("should query with deletedAt: null", async () => {
		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Eligibility
	// ──────────────────────────────────────────────────────────────

	it("should return error when eligibility check fails", async () => {
		mockCheckDiscountEligibility.mockReturnValue({
			eligible: false,
			error: "Ce code promo a expire",
		});

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Ce code promo a expire");
	});

	it("should fetch usage counts when maxUsagePerUser is set", async () => {
		const discountWithPerUser = {
			...mockDiscount,
			maxUsagePerUser: 3,
		};
		mockPrisma.discount.findUnique.mockResolvedValue(discountWithPerUser);

		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockGetDiscountUsageCounts).toHaveBeenCalledWith({
			discountId: "disc-123",
			userId: undefined,
			customerEmail: undefined,
		});
	});

	it("should NOT fetch usage counts when maxUsagePerUser is null", async () => {
		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockGetDiscountUsageCounts).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Calculation (P4 fix: uses calculateDiscountWithExclusion)
	// ──────────────────────────────────────────────────────────────

	it("should return valid result with discount amount", async () => {
		mockCalculateDiscountWithExclusion.mockReturnValue(1000);

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(true);
		expect(result.discount).toEqual({
			id: "disc-123",
			code: "PROMO20",
			type: "PERCENTAGE",
			value: 20,
			discountAmount: 1000,
			excludeSaleItems: true,
		});
	});

	it("should pass cart items to calculateDiscountWithExclusion with excludeSaleItems: true", async () => {
		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockCalculateDiscountWithExclusion).toHaveBeenCalledWith({
			type: "PERCENTAGE",
			value: 20,
			cartItems: [
				{
					priceInclTax: 2500,
					quantity: 2,
					compareAtPrice: null,
				},
			],
			excludeSaleItems: true,
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Session
	// ──────────────────────────────────────────────────────────────

	it("should use userId from session", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "clxxxxxxxxxxxxxxxxxxxxxxx", email: "user@test.com" },
		});

		const discountWithPerUser = {
			...mockDiscount,
			maxUsagePerUser: 1,
		};
		mockPrisma.discount.findUnique.mockResolvedValue(discountWithPerUser);

		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockGetDiscountUsageCounts).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "clxxxxxxxxxxxxxxxxxxxxxxx",
			}),
		);
	});

	it("should prefer session email over provided customerEmail", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "clxxxxxxxxxxxxxxxxxxxxxxx", email: "session@test.com" },
		});

		const discountWithPerUser = {
			...mockDiscount,
			maxUsagePerUser: 1,
		};
		mockPrisma.discount.findUnique.mockResolvedValue(discountWithPerUser);

		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL, "guest@test.com");

		expect(mockGetDiscountUsageCounts).toHaveBeenCalledWith(
			expect.objectContaining({
				customerEmail: "session@test.com",
			}),
		);
	});

	it("should work for guest checkout without session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL, "guest@test.com");

		expect(result.valid).toBe(true);
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should catch generic errors and return validation error message", async () => {
		mockHeaders.mockRejectedValue(new Error("Headers unavailable"));

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Erreur lors de la validation du code");
	});
});
