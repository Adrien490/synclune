import { describe, it, expect, vi } from "vitest";

// Mock Prisma client enums
vi.mock("@/app/generated/prisma/client", () => ({
	DiscountType: {
		PERCENTAGE: "PERCENTAGE",
		FIXED_AMOUNT: "FIXED_AMOUNT",
	},
}));

import {
	discountCodeSchema,
	validateDiscountCodeSchema,
	createDiscountSchema,
	updateDiscountSchema,
	deleteDiscountSchema,
	bulkDeleteDiscountsSchema,
	toggleDiscountStatusSchema,
	bulkToggleDiscountStatusSchema,
} from "../discount.schemas";

// ============================================================================
// Helpers
// ============================================================================

const VALID_CUID = "clh1z2x3y4w5v6u7t8s9r0q1p";

// ============================================================================
// discountCodeSchema
// ============================================================================

describe("discountCodeSchema", () => {
	it("should accept a valid uppercase code", () => {
		const result = discountCodeSchema.safeParse("SUMMER20");
		expect(result.success).toBe(true);
	});

	it("should accept a code with digits", () => {
		const result = discountCodeSchema.safeParse("PROMO2024");
		expect(result.success).toBe(true);
	});

	it("should accept a code with hyphens", () => {
		const result = discountCodeSchema.safeParse("BLACK-FRIDAY");
		expect(result.success).toBe(true);
	});

	it("should transform lowercase to uppercase", () => {
		const result = discountCodeSchema.safeParse("summer20");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("SUMMER20");
		}
	});

	it("should trim whitespace before validation", () => {
		const result = discountCodeSchema.safeParse("  PROMO  ");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("PROMO");
		}
	});

	it("should reject a code shorter than 3 characters", () => {
		const result = discountCodeSchema.safeParse("AB");
		expect(result.success).toBe(false);
	});

	it("should accept a code of exactly 3 characters", () => {
		const result = discountCodeSchema.safeParse("ABC");
		expect(result.success).toBe(true);
	});

	it("should reject a code longer than 30 characters", () => {
		const result = discountCodeSchema.safeParse("A".repeat(31));
		expect(result.success).toBe(false);
	});

	it("should accept a code of exactly 30 characters", () => {
		const result = discountCodeSchema.safeParse("A".repeat(30));
		expect(result.success).toBe(true);
	});

	it("should reject a code with special characters", () => {
		const result = discountCodeSchema.safeParse("PROMO@2024");
		expect(result.success).toBe(false);
	});

	it("should reject a code with spaces", () => {
		const result = discountCodeSchema.safeParse("BLACK FRIDAY");
		expect(result.success).toBe(false);
	});

	it("should reject a code with underscores", () => {
		const result = discountCodeSchema.safeParse("BLACK_FRIDAY");
		expect(result.success).toBe(false);
	});

	it("should reject an empty string", () => {
		const result = discountCodeSchema.safeParse("");
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// validateDiscountCodeSchema
// ============================================================================

describe("validateDiscountCodeSchema", () => {
	const validInput = {
		code: "PROMO10",
		subtotal: 5000,
	};

	it("should accept valid discount validation data", () => {
		const result = validateDiscountCodeSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("should accept with optional userId", () => {
		const result = validateDiscountCodeSchema.safeParse({
			...validInput,
			userId: VALID_CUID,
		});
		expect(result.success).toBe(true);
	});

	it("should succeed without userId (it is optional)", () => {
		const result = validateDiscountCodeSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("should accept with optional customerEmail for guest checkout", () => {
		const result = validateDiscountCodeSchema.safeParse({
			...validInput,
			customerEmail: "guest@example.com",
		});
		expect(result.success).toBe(true);
	});

	it("should reject an invalid customerEmail format", () => {
		const result = validateDiscountCodeSchema.safeParse({
			...validInput,
			customerEmail: "not-an-email",
		});
		expect(result.success).toBe(false);
	});

	it("should reject a negative subtotal", () => {
		const result = validateDiscountCodeSchema.safeParse({
			...validInput,
			subtotal: -100,
		});
		expect(result.success).toBe(false);
	});

	it("should accept subtotal of zero", () => {
		const result = validateDiscountCodeSchema.safeParse({
			...validInput,
			subtotal: 0,
		});
		expect(result.success).toBe(true);
	});

	it("should reject a non-integer subtotal", () => {
		const result = validateDiscountCodeSchema.safeParse({
			...validInput,
			subtotal: 49.99,
		});
		expect(result.success).toBe(false);
	});

	it("should reject when code is missing", () => {
		const { code: _c, ...withoutCode } = validInput;
		const result = validateDiscountCodeSchema.safeParse(withoutCode);
		expect(result.success).toBe(false);
	});

	it("should reject when subtotal is missing", () => {
		const { subtotal: _s, ...withoutSubtotal } = validInput;
		const result = validateDiscountCodeSchema.safeParse(withoutSubtotal);
		expect(result.success).toBe(false);
	});

	it("should reject an invalid discount code format", () => {
		const result = validateDiscountCodeSchema.safeParse({
			...validInput,
			code: "AB",
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// createDiscountSchema
// ============================================================================

describe("createDiscountSchema", () => {
	const validPercentageDiscount = {
		code: "SUMMER20",
		type: "PERCENTAGE",
		value: 20,
	};

	const validFixedDiscount = {
		code: "SAVE10",
		type: "FIXED_AMOUNT",
		value: 1000,
	};

	it("should accept a valid PERCENTAGE discount", () => {
		const result = createDiscountSchema.safeParse(validPercentageDiscount);
		expect(result.success).toBe(true);
	});

	it("should accept a valid FIXED_AMOUNT discount", () => {
		const result = createDiscountSchema.safeParse(validFixedDiscount);
		expect(result.success).toBe(true);
	});

	it("should reject when code is missing", () => {
		const { code: _c, ...withoutCode } = validPercentageDiscount;
		const result = createDiscountSchema.safeParse(withoutCode);
		expect(result.success).toBe(false);
	});

	it("should reject when type is missing", () => {
		const { type: _t, ...withoutType } = validPercentageDiscount;
		const result = createDiscountSchema.safeParse(withoutType);
		expect(result.success).toBe(false);
	});

	it("should reject an invalid type", () => {
		const result = createDiscountSchema.safeParse({ ...validPercentageDiscount, type: "INVALID" });
		expect(result.success).toBe(false);
	});

	it("should reject when value is missing", () => {
		const { value: _v, ...withoutValue } = validPercentageDiscount;
		const result = createDiscountSchema.safeParse(withoutValue);
		expect(result.success).toBe(false);
	});

	it("should reject a zero value", () => {
		const result = createDiscountSchema.safeParse({ ...validPercentageDiscount, value: 0 });
		expect(result.success).toBe(false);
	});

	it("should reject a negative value", () => {
		const result = createDiscountSchema.safeParse({ ...validPercentageDiscount, value: -10 });
		expect(result.success).toBe(false);
	});

	it("should reject PERCENTAGE discount value above 100 (cross-field refinement)", () => {
		const result = createDiscountSchema.safeParse({ ...validPercentageDiscount, value: 101 });
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths).toContain("value");
		}
	});

	it("should accept PERCENTAGE discount value of exactly 100", () => {
		const result = createDiscountSchema.safeParse({ ...validPercentageDiscount, value: 100 });
		expect(result.success).toBe(true);
	});

	it("should accept FIXED_AMOUNT discount value above 100 (no 100 cap)", () => {
		const result = createDiscountSchema.safeParse({ ...validFixedDiscount, value: 500 });
		expect(result.success).toBe(true);
	});

	it("should accept optional minOrderAmount", () => {
		const result = createDiscountSchema.safeParse({
			...validPercentageDiscount,
			minOrderAmount: 5000,
		});
		expect(result.success).toBe(true);
	});

	it("should accept optional maxUsageCount", () => {
		const result = createDiscountSchema.safeParse({
			...validPercentageDiscount,
			maxUsageCount: 100,
		});
		expect(result.success).toBe(true);
	});

	it("should accept optional maxUsagePerUser", () => {
		const result = createDiscountSchema.safeParse({
			...validPercentageDiscount,
			maxUsagePerUser: 1,
		});
		expect(result.success).toBe(true);
	});

	it("should reject endsAt before startsAt (cross-field refinement)", () => {
		const result = createDiscountSchema.safeParse({
			...validPercentageDiscount,
			startsAt: new Date("2025-12-01"),
			endsAt: new Date("2025-11-01"),
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."));
			expect(paths).toContain("endsAt");
		}
	});

	it("should reject startsAt equal to endsAt (cross-field refinement)", () => {
		const sameDate = new Date("2025-12-01");
		const result = createDiscountSchema.safeParse({
			...validPercentageDiscount,
			startsAt: sameDate,
			endsAt: sameDate,
		});
		expect(result.success).toBe(false);
	});

	it("should accept startsAt before endsAt", () => {
		const result = createDiscountSchema.safeParse({
			...validPercentageDiscount,
			startsAt: new Date("2025-11-01"),
			endsAt: new Date("2025-12-01"),
		});
		expect(result.success).toBe(true);
	});

	it("should coerce string date to Date for startsAt", () => {
		const result = createDiscountSchema.safeParse({
			...validPercentageDiscount,
			startsAt: "2025-11-01",
			endsAt: "2025-12-01",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.startsAt).toBeInstanceOf(Date);
		}
	});

	it("should accept null for nullable optional fields (minOrderAmount, maxUsageCount)", () => {
		const result = createDiscountSchema.safeParse({
			...validPercentageDiscount,
			minOrderAmount: null,
			maxUsageCount: null,
			maxUsagePerUser: null,
			startsAt: null,
			endsAt: null,
		});
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// updateDiscountSchema
// ============================================================================

describe("updateDiscountSchema", () => {
	const validInput = {
		id: VALID_CUID,
		code: "UPDATED20",
		type: "PERCENTAGE",
		value: 20,
	};

	it("should accept valid update discount data", () => {
		const result = updateDiscountSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("should reject when id is missing", () => {
		const { id: _i, ...withoutId } = validInput;
		const result = updateDiscountSchema.safeParse(withoutId);
		expect(result.success).toBe(false);
	});

	it("should reject a non-cuid2 id", () => {
		const result = updateDiscountSchema.safeParse({ ...validInput, id: "bad-id" });
		expect(result.success).toBe(false);
	});

	it("should reject PERCENTAGE value above 100 (inherited cross-field refinement)", () => {
		const result = updateDiscountSchema.safeParse({ ...validInput, value: 101 });
		expect(result.success).toBe(false);
	});

	it("should reject endsAt before startsAt (inherited cross-field refinement)", () => {
		const result = updateDiscountSchema.safeParse({
			...validInput,
			startsAt: new Date("2025-12-01"),
			endsAt: new Date("2025-11-01"),
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// deleteDiscountSchema
// ============================================================================

describe("deleteDiscountSchema", () => {
	it("should accept a valid cuid2 id", () => {
		const result = deleteDiscountSchema.safeParse({ id: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("should reject a non-cuid2 id", () => {
		const result = deleteDiscountSchema.safeParse({ id: "not-a-cuid" });
		expect(result.success).toBe(false);
	});

	it("should reject an empty id", () => {
		const result = deleteDiscountSchema.safeParse({ id: "" });
		expect(result.success).toBe(false);
	});

	it("should reject when id is missing", () => {
		const result = deleteDiscountSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkDeleteDiscountsSchema
// ============================================================================

describe("bulkDeleteDiscountsSchema", () => {
	it("should accept an array with at least one valid cuid2", () => {
		const result = bulkDeleteDiscountsSchema.safeParse({ ids: [VALID_CUID] });
		expect(result.success).toBe(true);
	});

	it("should reject an empty ids array", () => {
		const result = bulkDeleteDiscountsSchema.safeParse({ ids: [] });
		expect(result.success).toBe(false);
	});

	it("should reject an ids array with more than 100 items", () => {
		const ids = Array.from({ length: 101 }, () => VALID_CUID);
		const result = bulkDeleteDiscountsSchema.safeParse({ ids });
		expect(result.success).toBe(false);
	});

	it("should accept an ids array of exactly 100 items", () => {
		const ids = Array.from({ length: 100 }, () => VALID_CUID);
		const result = bulkDeleteDiscountsSchema.safeParse({ ids });
		expect(result.success).toBe(true);
	});

	it("should reject when ids contains an invalid cuid2", () => {
		const result = bulkDeleteDiscountsSchema.safeParse({ ids: ["not-a-cuid"] });
		expect(result.success).toBe(false);
	});

	it("should reject when ids is missing", () => {
		const result = bulkDeleteDiscountsSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// toggleDiscountStatusSchema
// ============================================================================

describe("toggleDiscountStatusSchema", () => {
	it("should accept a valid cuid2 id", () => {
		const result = toggleDiscountStatusSchema.safeParse({ id: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("should reject a non-cuid2 id", () => {
		const result = toggleDiscountStatusSchema.safeParse({ id: "not-a-cuid" });
		expect(result.success).toBe(false);
	});

	it("should reject when id is missing", () => {
		const result = toggleDiscountStatusSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// bulkToggleDiscountStatusSchema
// ============================================================================

describe("bulkToggleDiscountStatusSchema", () => {
	it("should accept valid ids and isActive true", () => {
		const result = bulkToggleDiscountStatusSchema.safeParse({
			ids: [VALID_CUID],
			isActive: true,
		});
		expect(result.success).toBe(true);
	});

	it("should accept valid ids and isActive false", () => {
		const result = bulkToggleDiscountStatusSchema.safeParse({
			ids: [VALID_CUID],
			isActive: false,
		});
		expect(result.success).toBe(true);
	});

	it("should reject an empty ids array", () => {
		const result = bulkToggleDiscountStatusSchema.safeParse({
			ids: [],
			isActive: true,
		});
		expect(result.success).toBe(false);
	});

	it("should reject ids array exceeding 100 items", () => {
		const ids = Array.from({ length: 101 }, () => VALID_CUID);
		const result = bulkToggleDiscountStatusSchema.safeParse({ ids, isActive: true });
		expect(result.success).toBe(false);
	});

	it("should reject when isActive is missing", () => {
		const result = bulkToggleDiscountStatusSchema.safeParse({ ids: [VALID_CUID] });
		expect(result.success).toBe(false);
	});

	it("should reject when ids is missing", () => {
		const result = bulkToggleDiscountStatusSchema.safeParse({ isActive: true });
		expect(result.success).toBe(false);
	});
});
