import { describe, it, expect, vi, beforeEach } from "vitest";

import { checkDiscountEligibility } from "../discount-eligibility.service";
import type {
	DiscountValidation,
	DiscountApplicationContext,
} from "../../types/discount.types";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDiscount(
	overrides: Partial<DiscountValidation> = {}
): DiscountValidation {
	return {
		id: "discount-1",
		code: "PROMO10",
		type: "PERCENTAGE" as DiscountValidation["type"],
		value: 10,
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		usageCount: 0,
		isActive: true,
		startsAt: new Date("2026-01-01T00:00:00Z"),
		endsAt: null,
		...overrides,
	};
}

function makeContext(
	overrides: Partial<DiscountApplicationContext> = {}
): DiscountApplicationContext {
	return {
		subtotal: 5000,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkDiscountEligibility", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-17T12:00:00Z"));
	});

	// -------------------------------------------------------------------------
	// 1. isActive
	// -------------------------------------------------------------------------

	describe("isActive check", () => {
		it("should return not eligible when discount is inactive", () => {
			const discount = makeDiscount({ isActive: false });
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(false);
			expect(result.error).toBe("Ce code promo n'est plus actif");
		});

		it("should proceed with validation when discount is active", () => {
			const discount = makeDiscount({ isActive: true });
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Date range
	// -------------------------------------------------------------------------

	describe("date range check", () => {
		it("should return not eligible when startsAt is in the future", () => {
			const discount = makeDiscount({
				startsAt: new Date("2026-02-18T00:00:00Z"),
			});
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(false);
			expect(result.error).toBe("Ce code promo n'est pas encore actif");
		});

		it("should return not eligible when endsAt is in the past", () => {
			const discount = makeDiscount({
				endsAt: new Date("2026-02-16T23:59:59Z"),
			});
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(false);
			expect(result.error).toBe("Ce code promo a expiré");
		});

		it("should return eligible when startsAt is in the past and endsAt is in the future", () => {
			const discount = makeDiscount({
				startsAt: new Date("2026-02-01T00:00:00Z"),
				endsAt: new Date("2026-03-01T00:00:00Z"),
			});
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(true);
		});

		it("should return eligible when startsAt is in the past and endsAt is null", () => {
			const discount = makeDiscount({ endsAt: null });
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(true);
		});

		it("should return eligible when only startsAt is set and is in the past", () => {
			const discount = makeDiscount({
				startsAt: new Date("2026-01-01T00:00:00Z"),
				endsAt: null,
			});
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(true);
		});

		it("should return eligible when only endsAt is set and is in the future", () => {
			const discount = makeDiscount({
				startsAt: null,
				endsAt: new Date("2026-12-31T23:59:59Z"),
			});
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 3. minOrderAmount
	// -------------------------------------------------------------------------

	describe("minOrderAmount check", () => {
		it("should return not eligible when subtotal is below minOrderAmount", () => {
			const discount = makeDiscount({ minOrderAmount: 5001 });
			const context = makeContext({ subtotal: 5000 });
			const result = checkDiscountEligibility(discount, context);

			expect(result.eligible).toBe(false);
			// minOrderAmount 5001 centimes = 50.01 euros
			expect(result.error).toBe("Commande minimum de 50.01€ requise");
		});

		it("should return eligible when subtotal exactly meets minOrderAmount", () => {
			const discount = makeDiscount({ minOrderAmount: 5000 });
			const context = makeContext({ subtotal: 5000 });
			const result = checkDiscountEligibility(discount, context);

			expect(result.eligible).toBe(true);
		});

		it("should return eligible when subtotal exceeds minOrderAmount", () => {
			const discount = makeDiscount({ minOrderAmount: 3000 });
			const context = makeContext({ subtotal: 5000 });
			const result = checkDiscountEligibility(discount, context);

			expect(result.eligible).toBe(true);
		});

		it("should return eligible when minOrderAmount is null", () => {
			const discount = makeDiscount({ minOrderAmount: null });
			const context = makeContext({ subtotal: 100 });
			const result = checkDiscountEligibility(discount, context);

			expect(result.eligible).toBe(true);
		});

		it("should format the error amount in euros with two decimal places", () => {
			const discount = makeDiscount({ minOrderAmount: 10000 });
			const context = makeContext({ subtotal: 9999 });
			const result = checkDiscountEligibility(discount, context);

			expect(result.error).toBe("Commande minimum de 100.00€ requise");
		});
	});

	// -------------------------------------------------------------------------
	// 4. maxUsageCount
	// -------------------------------------------------------------------------

	describe("maxUsageCount check", () => {
		it("should return not eligible when usageCount equals maxUsageCount", () => {
			const discount = makeDiscount({ maxUsageCount: 10, usageCount: 10 });
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(false);
			expect(result.error).toBe(
				"Ce code promo a atteint sa limite d'utilisation"
			);
		});

		it("should return not eligible when usageCount exceeds maxUsageCount", () => {
			const discount = makeDiscount({ maxUsageCount: 10, usageCount: 11 });
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(false);
			expect(result.error).toBe(
				"Ce code promo a atteint sa limite d'utilisation"
			);
		});

		it("should return eligible when usageCount is below maxUsageCount", () => {
			const discount = makeDiscount({ maxUsageCount: 10, usageCount: 9 });
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(true);
		});

		it("should return eligible when maxUsageCount is null", () => {
			const discount = makeDiscount({ maxUsageCount: null, usageCount: 99 });
			const result = checkDiscountEligibility(discount, makeContext());

			expect(result.eligible).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 5. maxUsagePerUser
	// -------------------------------------------------------------------------

	describe("maxUsagePerUser check", () => {
		it("should return not eligible when userId has reached the per-user limit", () => {
			const discount = makeDiscount({ maxUsagePerUser: 1 });
			const context = makeContext({ userId: "user-1" });
			const usageCounts = { userCount: 1, emailCount: 0 };

			const result = checkDiscountEligibility(discount, context, usageCounts);

			expect(result.eligible).toBe(false);
			expect(result.error).toBe("Vous avez déjà utilisé ce code promo");
		});

		it("should return not eligible when userId has exceeded the per-user limit", () => {
			const discount = makeDiscount({ maxUsagePerUser: 2 });
			const context = makeContext({ userId: "user-1" });
			const usageCounts = { userCount: 3, emailCount: 0 };

			const result = checkDiscountEligibility(discount, context, usageCounts);

			expect(result.eligible).toBe(false);
			expect(result.error).toBe("Vous avez déjà utilisé ce code promo");
		});

		it("should return eligible when userId is below the per-user limit", () => {
			const discount = makeDiscount({ maxUsagePerUser: 3 });
			const context = makeContext({ userId: "user-1" });
			const usageCounts = { userCount: 2, emailCount: 0 };

			const result = checkDiscountEligibility(discount, context, usageCounts);

			expect(result.eligible).toBe(true);
		});

		it("should return not eligible when guest email has reached the per-user limit", () => {
			const discount = makeDiscount({ maxUsagePerUser: 1 });
			const context = makeContext({ customerEmail: "guest@example.com" });
			const usageCounts = { userCount: 0, emailCount: 1 };

			const result = checkDiscountEligibility(discount, context, usageCounts);

			expect(result.eligible).toBe(false);
			expect(result.error).toBe("Vous avez déjà utilisé ce code promo");
		});

		it("should return eligible when guest email is below the per-user limit", () => {
			const discount = makeDiscount({ maxUsagePerUser: 2 });
			const context = makeContext({ customerEmail: "guest@example.com" });
			const usageCounts = { userCount: 0, emailCount: 1 };

			const result = checkDiscountEligibility(discount, context, usageCounts);

			expect(result.eligible).toBe(true);
		});

		it("should return eligible when neither userId nor email are provided", () => {
			const discount = makeDiscount({ maxUsagePerUser: 1 });
			const context = makeContext({ userId: undefined, customerEmail: undefined });
			const usageCounts = { userCount: 0, emailCount: 0 };

			const result = checkDiscountEligibility(discount, context, usageCounts);

			expect(result.eligible).toBe(true);
			// Cannot verify usage without identifier — deferred to checkout
		});

		it("should check userId limit and not emailCount when userId is present", () => {
			// userId check takes precedence: even if emailCount is high, userId count is what matters
			const discount = makeDiscount({ maxUsagePerUser: 2 });
			const context = makeContext({
				userId: "user-1",
				customerEmail: "user@example.com",
			});
			const usageCounts = { userCount: 1, emailCount: 5 };

			const result = checkDiscountEligibility(discount, context, usageCounts);

			// userCount (1) < maxUsagePerUser (2) -> eligible
			// emailCount branch is skipped because userId is present
			expect(result.eligible).toBe(true);
		});

		it("should return eligible when no usageCounts provided (caller skipped fetch)", () => {
			const discount = makeDiscount({ maxUsagePerUser: 1 });
			const context = makeContext({ userId: "user-1" });

			// No usageCounts passed -> per-user check is skipped
			const result = checkDiscountEligibility(discount, context);

			expect(result.eligible).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// All conditions pass
	// -------------------------------------------------------------------------

	describe("all conditions pass", () => {
		it("should return eligible when all conditions are satisfied", () => {
			const discount = makeDiscount({
				isActive: true,
				startsAt: new Date("2026-01-01T00:00:00Z"),
				endsAt: new Date("2026-12-31T23:59:59Z"),
				minOrderAmount: 2000,
				maxUsageCount: 100,
				usageCount: 42,
				maxUsagePerUser: 3,
			});
			const context = makeContext({
				subtotal: 5000,
				userId: "user-1",
				customerEmail: "user@example.com",
			});
			const usageCounts = { userCount: 1, emailCount: 1 };

			const result = checkDiscountEligibility(discount, context, usageCounts);

			expect(result.eligible).toBe(true);
			expect(result.error).toBeUndefined();
		});
	});
});
