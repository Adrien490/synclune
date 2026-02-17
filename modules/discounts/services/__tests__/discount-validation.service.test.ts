import { describe, it, expect } from "vitest";

import type { DiscountValidation } from "../../types/discount.types";
import {
	isDiscountCurrentlyValid,
	getDiscountStatus,
	isMinOrderAmountMet,
	isMaxUsageReached,
} from "../discount-validation.service";

// ============================================================================
// HELPERS
// ============================================================================

function createMockDiscount(overrides: Partial<DiscountValidation> = {}): DiscountValidation {
	return {
		id: "disc-1",
		code: "TEST20",
		type: "PERCENTAGE" as any,
		value: 20,
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		usageCount: 0,
		isActive: true,
		startsAt: new Date("2026-01-01"),
		endsAt: null,
		...overrides,
	};
}

// ============================================================================
// isDiscountCurrentlyValid
// ============================================================================

describe("isDiscountCurrentlyValid", () => {
	it("should return true for an active discount with no usage limit", () => {
		const discount = createMockDiscount();
		expect(isDiscountCurrentlyValid(discount)).toBe(true);
	});

	it("should return false when discount is inactive", () => {
		const discount = createMockDiscount({ isActive: false });
		expect(isDiscountCurrentlyValid(discount)).toBe(false);
	});

	it("should return false when usage count has reached the max", () => {
		const discount = createMockDiscount({ maxUsageCount: 100, usageCount: 100 });
		expect(isDiscountCurrentlyValid(discount)).toBe(false);
	});

	it("should return false when usage count exceeds the max", () => {
		const discount = createMockDiscount({ maxUsageCount: 50, usageCount: 51 });
		expect(isDiscountCurrentlyValid(discount)).toBe(false);
	});

	it("should return true when usage count is below the max", () => {
		const discount = createMockDiscount({ maxUsageCount: 100, usageCount: 99 });
		expect(isDiscountCurrentlyValid(discount)).toBe(true);
	});

	it("should return true for an active discount with no usage limit set", () => {
		const discount = createMockDiscount({ maxUsageCount: null, usageCount: 0 });
		expect(isDiscountCurrentlyValid(discount)).toBe(true);
	});

	it("should prioritize inactive status over exhausted usage", () => {
		const discount = createMockDiscount({
			isActive: false,
			maxUsageCount: 10,
			usageCount: 10,
		});
		expect(isDiscountCurrentlyValid(discount)).toBe(false);
	});
});

// ============================================================================
// getDiscountStatus
// ============================================================================

describe("getDiscountStatus", () => {
	it("should return 'active' for an active discount with no usage limit", () => {
		const discount = createMockDiscount();
		expect(getDiscountStatus(discount)).toBe("active");
	});

	it("should return 'inactive' when discount is not active", () => {
		const discount = createMockDiscount({ isActive: false });
		expect(getDiscountStatus(discount)).toBe("inactive");
	});

	it("should return 'exhausted' when usage count has reached the max", () => {
		const discount = createMockDiscount({ maxUsageCount: 100, usageCount: 100 });
		expect(getDiscountStatus(discount)).toBe("exhausted");
	});

	it("should return 'exhausted' when usage count exceeds the max", () => {
		const discount = createMockDiscount({ maxUsageCount: 50, usageCount: 55 });
		expect(getDiscountStatus(discount)).toBe("exhausted");
	});

	it("should return 'active' when usage count is below the max", () => {
		const discount = createMockDiscount({ maxUsageCount: 100, usageCount: 99 });
		expect(getDiscountStatus(discount)).toBe("active");
	});

	it("should return 'inactive' even if usage would also be exhausted", () => {
		const discount = createMockDiscount({
			isActive: false,
			maxUsageCount: 10,
			usageCount: 10,
		});
		expect(getDiscountStatus(discount)).toBe("inactive");
	});

	it("should return 'active' for a discount with no usage limit and zero usage", () => {
		const discount = createMockDiscount({ maxUsageCount: null, usageCount: 0 });
		expect(getDiscountStatus(discount)).toBe("active");
	});
});

// ============================================================================
// isMinOrderAmountMet
// ============================================================================

describe("isMinOrderAmountMet", () => {
	it("should return true when there is no minimum order amount", () => {
		expect(isMinOrderAmountMet(0, null)).toBe(true);
	});

	it("should return true when subtotal is above the minimum", () => {
		expect(isMinOrderAmountMet(5000, 3000)).toBe(true);
	});

	it("should return false when subtotal is below the minimum", () => {
		expect(isMinOrderAmountMet(2000, 3000)).toBe(false);
	});

	it("should return true when subtotal is exactly at the minimum boundary", () => {
		expect(isMinOrderAmountMet(3000, 3000)).toBe(true);
	});

	it("should return true when subtotal is zero and there is no minimum", () => {
		expect(isMinOrderAmountMet(0, null)).toBe(true);
	});
});

// ============================================================================
// isMaxUsageReached
// ============================================================================

describe("isMaxUsageReached", () => {
	it("should return false when there is no usage limit", () => {
		expect(isMaxUsageReached(999, null)).toBe(false);
	});

	it("should return true when usage count has reached the limit", () => {
		expect(isMaxUsageReached(100, 100)).toBe(true);
	});

	it("should return false when usage count is below the limit", () => {
		expect(isMaxUsageReached(99, 100)).toBe(false);
	});

	it("should return true when usage count exceeds the limit", () => {
		expect(isMaxUsageReached(101, 100)).toBe(true);
	});

	it("should return false when usage count is zero and there is no limit", () => {
		expect(isMaxUsageReached(0, null)).toBe(false);
	});

	it("should return true at the exact boundary (usage equals max)", () => {
		expect(isMaxUsageReached(1, 1)).toBe(true);
	});
});
