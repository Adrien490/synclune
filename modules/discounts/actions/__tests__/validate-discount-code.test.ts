import { describe, it, expect, vi, beforeEach } from "vitest";

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
	mockCalculateDiscountAmount,
	mockGetDiscountUsageCounts,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: {
			findFirst: vi.fn(),
		},
	},
	mockHeaders: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockGetSession: vi.fn(),
	mockCheckDiscountEligibility: vi.fn(),
	mockCalculateDiscountAmount: vi.fn(),
	mockGetDiscountUsageCounts: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
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

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("../../services/discount-eligibility.service", () => ({
	checkDiscountEligibility: mockCheckDiscountEligibility,
}));

vi.mock("../../services/discount-calculation.service", () => ({
	calculateDiscountAmount: mockCalculateDiscountAmount,
}));

vi.mock("../../data/get-discount-usage-counts", () => ({
	getDiscountUsageCounts: mockGetDiscountUsageCounts,
}));

vi.mock("../../constants/discount.constants", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../constants/discount.constants")>();
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
const VALID_SUBTOTAL = 5000; // 50€ in cents

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

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: no session (guest checkout)
		mockGetSession.mockResolvedValue(null);

		// Default: discount found
		mockPrisma.discount.findFirst.mockResolvedValue(mockDiscount);

		// Default: eligible
		mockCheckDiscountEligibility.mockReturnValue({ eligible: true });

		// Default: calculated amount
		mockCalculateDiscountAmount.mockReturnValue(1000);

		// Default: usage counts
		mockGetDiscountUsageCounts.mockResolvedValue({
			userCount: 0,
			emailCount: 0,
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting
	// ──────────────────────────────────────────────────────────────

	it("should return error when rate limited", async () => {
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
			"10.0.0.1"
		);
	});

	it("should use 'unknown' IP when getClientIp returns null", async () => {
		mockGetClientIp.mockResolvedValue(null);

		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockEnforceRateLimit).toHaveBeenCalledWith(
			"ip:unknown",
			"validate-discount",
			"unknown"
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Input validation
	// ──────────────────────────────────────────────────────────────

	it("should return error for invalid code format", async () => {
		// Code with spaces/special chars is invalid (regex: ^[A-Z0-9-]+$)
		const result = await validateDiscountCode("AB", VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Format de code invalide");
	});

	it("should return error for negative subtotal", async () => {
		const result = await validateDiscountCode(VALID_CODE, -100);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Erreur de calcul du panier");
	});

	it("should normalize code to uppercase", async () => {
		await validateDiscountCode("promo20", VALID_SUBTOTAL);

		expect(mockPrisma.discount.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { code: "PROMO20", deletedAt: null },
			})
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Retry path
	// ──────────────────────────────────────────────────────────────

	it("should retry without userId when userId validation fails", async () => {
		// Session with invalid userId format
		mockGetSession.mockResolvedValue({
			user: { id: "not-a-cuid2", email: "user@test.com" },
		});

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		// Should still succeed via retry path
		expect(result.valid).toBe(true);
		expect(mockPrisma.discount.findFirst).toHaveBeenCalled();
	});

	it("should return error for invalid customerEmail", async () => {
		// No session, invalid guest email
		const result = await validateDiscountCode(
			VALID_CODE,
			VALID_SUBTOTAL,
			"not-an-email"
		);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Adresse email invalide");
	});

	it("should preserve customerEmail in retry when userId fails", async () => {
		// Session with invalid userId but valid email
		mockGetSession.mockResolvedValue({
			user: { id: "not-a-cuid2", email: "valid@test.com" },
		});

		const discountWithPerUser = {
			...mockDiscount,
			maxUsagePerUser: 1,
		};
		mockPrisma.discount.findFirst.mockResolvedValue(discountWithPerUser);

		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		// getDiscountUsageCounts should still receive the email
		expect(mockGetDiscountUsageCounts).toHaveBeenCalledWith(
			expect.objectContaining({
				customerEmail: "valid@test.com",
			})
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Discount lookup
	// ──────────────────────────────────────────────────────────────

	it("should return error when discount not found", async () => {
		mockPrisma.discount.findFirst.mockResolvedValue(null);

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Code promo introuvable");
	});

	it("should query with deletedAt: null", async () => {
		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockPrisma.discount.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			})
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Eligibility
	// ──────────────────────────────────────────────────────────────

	it("should return error when eligibility check fails", async () => {
		mockCheckDiscountEligibility.mockReturnValue({
			eligible: false,
			error: "Ce code promo a expiré",
		});

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Ce code promo a expiré");
	});

	it("should fetch usage counts when maxUsagePerUser is set", async () => {
		const discountWithPerUser = {
			...mockDiscount,
			maxUsagePerUser: 3,
		};
		mockPrisma.discount.findFirst.mockResolvedValue(discountWithPerUser);

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
	// Calculation
	// ──────────────────────────────────────────────────────────────

	it("should return valid result with discount amount", async () => {
		mockCalculateDiscountAmount.mockReturnValue(1000);

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(true);
		expect(result.discount).toEqual({
			id: "disc-123",
			code: "PROMO20",
			type: "PERCENTAGE",
			value: 20,
			discountAmount: 1000,
		});
	});

	it("should pass correct params to calculateDiscountAmount", async () => {
		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockCalculateDiscountAmount).toHaveBeenCalledWith({
			type: "PERCENTAGE",
			value: 20,
			subtotal: VALID_SUBTOTAL,
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
		mockPrisma.discount.findFirst.mockResolvedValue(discountWithPerUser);

		await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(mockGetDiscountUsageCounts).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "clxxxxxxxxxxxxxxxxxxxxxxx",
			})
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
		mockPrisma.discount.findFirst.mockResolvedValue(discountWithPerUser);

		await validateDiscountCode(
			VALID_CODE,
			VALID_SUBTOTAL,
			"guest@test.com"
		);

		expect(mockGetDiscountUsageCounts).toHaveBeenCalledWith(
			expect.objectContaining({
				customerEmail: "session@test.com",
			})
		);
	});

	it("should work for guest checkout without session", async () => {
		mockGetSession.mockResolvedValue(null);

		const result = await validateDiscountCode(
			VALID_CODE,
			VALID_SUBTOTAL,
			"guest@test.com"
		);

		expect(result.valid).toBe(true);
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should catch generic errors and return validation error message", async () => {
		// Error before lookupAndValidate (e.g. headers fails)
		mockHeaders.mockRejectedValue(new Error("Headers unavailable"));

		const result = await validateDiscountCode(VALID_CODE, VALID_SUBTOTAL);

		expect(result.valid).toBe(false);
		expect(result.error).toBe("Erreur lors de la validation du code");
	});
});
