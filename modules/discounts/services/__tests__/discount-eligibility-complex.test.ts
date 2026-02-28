import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../discount-validation.service", () => ({
	isDiscountCurrentlyValid: vi.fn(),
	getDiscountStatus: vi.fn(),
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		NOT_ACTIVE: "Ce code promo n'est plus actif",
		NOT_YET_ACTIVE: "Ce code promo n'est pas encore actif",
		EXPIRED: "Ce code promo a expiré",
		MAX_USAGE_REACHED: "Ce code promo a atteint sa limite d'utilisation",
		USER_MAX_USAGE_REACHED: "Vous avez déjà utilisé ce code promo",
		MIN_ORDER_NOT_MET: "Commande minimum de {amount}€ requise",
	},
}));

import { checkDiscountEligibility } from "../discount-eligibility.service";
import type { DiscountValidation, DiscountApplicationContext } from "../../types/discount.types";

// ============================================================================
// Helpers
// ============================================================================

function makeDiscount(overrides: Partial<DiscountValidation> = {}): DiscountValidation {
	return {
		id: "disc-1",
		code: "PROMO20",
		type: "PERCENTAGE",
		value: 20,
		isActive: true,
		startsAt: new Date("2026-01-01"),
		endsAt: new Date("2026-12-31"),
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		usageCount: 0,
		...overrides,
	} as DiscountValidation;
}

function makeContext(
	overrides: Partial<DiscountApplicationContext> = {},
): DiscountApplicationContext {
	return {
		subtotal: 10000,
		userId: "user-1",
		...overrides,
	};
}

// ============================================================================
// checkDiscountEligibility — complex scenarios
// ============================================================================

describe("checkDiscountEligibility — complex scenarios", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
	});

	// -------------------------------------------------------------------
	// Eligibility — happy path
	// -------------------------------------------------------------------

	it("should accept a valid active discount within date range", () => {
		const result = checkDiscountEligibility(makeDiscount(), makeContext());

		expect(result).toEqual({ eligible: true });
	});

	it("should accept discount at exact minimum boundary (subtotal === minOrderAmount)", () => {
		const discount = makeDiscount({ minOrderAmount: 5000 });
		const context = makeContext({ subtotal: 5000 });

		const result = checkDiscountEligibility(discount, context);

		expect(result).toEqual({ eligible: true });
	});

	it("should accept discount above minimum boundary", () => {
		const discount = makeDiscount({ minOrderAmount: 5000 });
		const context = makeContext({ subtotal: 5001 });

		const result = checkDiscountEligibility(discount, context);

		expect(result).toEqual({ eligible: true });
	});

	it("should accept discount when no usage limits are set", () => {
		const discount = makeDiscount({
			maxUsageCount: null,
			maxUsagePerUser: null,
			usageCount: 999,
		});

		const result = checkDiscountEligibility(discount, makeContext());

		expect(result).toEqual({ eligible: true });
	});

	// -------------------------------------------------------------------
	// Inactive discount
	// -------------------------------------------------------------------

	it("should reject inactive discount", () => {
		const discount = makeDiscount({ isActive: false });

		const result = checkDiscountEligibility(discount, makeContext());

		expect(result).toEqual({
			eligible: false,
			error: "Ce code promo n'est plus actif",
		});
	});

	// -------------------------------------------------------------------
	// Time period checks
	// -------------------------------------------------------------------

	it("should reject discount that hasn't started yet", () => {
		const discount = makeDiscount({
			startsAt: new Date("2026-12-01"),
		});

		const result = checkDiscountEligibility(discount, makeContext());

		expect(result).toEqual({
			eligible: false,
			error: "Ce code promo n'est pas encore actif",
		});
	});

	it("should reject expired discount", () => {
		const discount = makeDiscount({
			endsAt: new Date("2026-01-01"),
		});

		const result = checkDiscountEligibility(discount, makeContext());

		expect(result).toEqual({
			eligible: false,
			error: "Ce code promo a expiré",
		});
	});

	it("should accept discount with null endsAt (no expiration)", () => {
		const discount = makeDiscount({ endsAt: null });

		const result = checkDiscountEligibility(discount, makeContext());

		expect(result).toEqual({ eligible: true });
	});

	it("should accept discount with null startsAt (immediately valid)", () => {
		const discount = makeDiscount({ startsAt: null as unknown as undefined });

		const result = checkDiscountEligibility(discount, makeContext());

		expect(result).toEqual({ eligible: true });
	});

	// -------------------------------------------------------------------
	// Minimum order amount
	// -------------------------------------------------------------------

	it("should reject if order subtotal below minimum", () => {
		const discount = makeDiscount({ minOrderAmount: 5000 });
		const context = makeContext({ subtotal: 4999 });

		const result = checkDiscountEligibility(discount, context);

		expect(result).toEqual({
			eligible: false,
			error: "Commande minimum de 50.00€ requise",
		});
	});

	it("should format minimum amount correctly for whole numbers", () => {
		const discount = makeDiscount({ minOrderAmount: 10000 });
		const context = makeContext({ subtotal: 5000 });

		const result = checkDiscountEligibility(discount, context);

		expect(result.eligible).toBe(false);
		if (!result.eligible) {
			expect(result.error).toContain("100.00€");
		}
	});

	// -------------------------------------------------------------------
	// Global usage limit
	// -------------------------------------------------------------------

	it("should reject when global usage limit reached (usageCount === maxUsageCount)", () => {
		const discount = makeDiscount({
			maxUsageCount: 100,
			usageCount: 100,
		});

		const result = checkDiscountEligibility(discount, makeContext());

		expect(result).toEqual({
			eligible: false,
			error: "Ce code promo a atteint sa limite d'utilisation",
		});
	});

	it("should reject when global usage exceeds limit", () => {
		const discount = makeDiscount({
			maxUsageCount: 50,
			usageCount: 51,
		});

		const result = checkDiscountEligibility(discount, makeContext());

		expect(result).toEqual({
			eligible: false,
			error: "Ce code promo a atteint sa limite d'utilisation",
		});
	});

	it("should accept when usage is one below limit", () => {
		const discount = makeDiscount({
			maxUsageCount: 100,
			usageCount: 99,
		});

		const result = checkDiscountEligibility(discount, makeContext());

		expect(result).toEqual({ eligible: true });
	});

	// -------------------------------------------------------------------
	// Per-user usage limit
	// -------------------------------------------------------------------

	it("should reject per-user usage limit exceeded for authenticated user", () => {
		const discount = makeDiscount({ maxUsagePerUser: 1 });
		const context = makeContext({ userId: "user-1" });

		const result = checkDiscountEligibility(discount, context, {
			userCount: 1,
			emailCount: 0,
		});

		expect(result).toEqual({
			eligible: false,
			error: "Vous avez déjà utilisé ce code promo",
		});
	});

	it("should accept per-user when under limit", () => {
		const discount = makeDiscount({ maxUsagePerUser: 3 });
		const context = makeContext({ userId: "user-1" });

		const result = checkDiscountEligibility(discount, context, {
			userCount: 2,
			emailCount: 0,
		});

		expect(result).toEqual({ eligible: true });
	});

	it("should check email count for guest checkout (no userId)", () => {
		const discount = makeDiscount({ maxUsagePerUser: 1 });
		const context = makeContext({
			userId: undefined,
			customerEmail: "guest@example.com",
		});

		const result = checkDiscountEligibility(discount, context, {
			userCount: 0,
			emailCount: 1,
		});

		expect(result).toEqual({
			eligible: false,
			error: "Vous avez déjà utilisé ce code promo",
		});
	});

	it("should skip per-user check when neither userId nor customerEmail provided", () => {
		const discount = makeDiscount({ maxUsagePerUser: 1 });
		const context = makeContext({
			userId: undefined,
			customerEmail: undefined,
		});

		const result = checkDiscountEligibility(discount, context, {
			userCount: 5,
			emailCount: 5,
		});

		// Per-user check is skipped — will be validated at payment time
		expect(result).toEqual({ eligible: true });
	});

	it("should skip per-user check when usageCounts not provided", () => {
		const discount = makeDiscount({ maxUsagePerUser: 1 });
		const context = makeContext({ userId: "user-1" });

		// No usageCounts argument
		const result = checkDiscountEligibility(discount, context);

		expect(result).toEqual({ eligible: true });
	});

	// -------------------------------------------------------------------
	// Priority order: checks should fail fast
	// -------------------------------------------------------------------

	it("should reject with NOT_ACTIVE before checking dates", () => {
		const discount = makeDiscount({
			isActive: false,
			startsAt: new Date("2026-12-01"),
		});

		const result = checkDiscountEligibility(discount, makeContext());

		// isActive check takes priority over startsAt check
		expect(result).toEqual({
			eligible: false,
			error: "Ce code promo n'est plus actif",
		});
	});

	it("should reject with EXPIRED before checking min order", () => {
		const discount = makeDiscount({
			endsAt: new Date("2026-01-01"),
			minOrderAmount: 5000,
		});
		const context = makeContext({ subtotal: 1000 });

		const result = checkDiscountEligibility(discount, context);

		// EXPIRED check takes priority over MIN_ORDER_NOT_MET
		expect(result).toEqual({
			eligible: false,
			error: "Ce code promo a expiré",
		});
	});
});
