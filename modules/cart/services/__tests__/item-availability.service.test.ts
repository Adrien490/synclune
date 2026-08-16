import { describe, it, expect } from "vitest";
import {
	isCartItemVariantInactive,
	isCartItemProductNotPublic,
	isCartItemZeroStock,
	hasInsufficientStock,
	isCartItemUnavailable,
	checkCartItemAvailability,
	validateCartItems,
	filterUnavailableItems,
} from "../item-availability.service";
import type { CartItemForValidation } from "../../types/cart.types";

// `isCartItemDeleted` (toujours faux depuis le schéma lean) et son issueType
// « DELETED » ont été retirés (audit panier 2026-08-15) : une ligne au variant
// disparu est écartée en amont, la branche était inatteignable.

function createItem(
	overrides?: Partial<{
		variantId: string;
		quantity: number;
		stock: number;
		active: boolean;
		productActive: boolean;
		productTitle: string;
	}>,
): CartItemForValidation {
	return {
		variantId: overrides?.variantId ?? "variant-1",
		quantity: overrides?.quantity ?? 1,
		variant: {
			id: overrides?.variantId ?? "variant-1",
			active: overrides?.active ?? true,
			stock: overrides?.stock ?? 10,
			product: {
				id: "prod-1",
				name: overrides?.productTitle ?? "Bracelet Lune",
				active: overrides?.productActive ?? true,
			},
		},
	};
}

// ============================================================================
// INDIVIDUAL CHECK FUNCTIONS
// ============================================================================

describe("isCartItemVariantInactive", () => {
	it("should return true when VARIANT is inactive", () => {
		expect(isCartItemVariantInactive(createItem({ active: false }))).toBe(true);
	});

	it("should return false when VARIANT is active", () => {
		expect(isCartItemVariantInactive(createItem({ active: true }))).toBe(false);
	});
});

describe("isCartItemProductNotPublic", () => {
	it("should return true when product is inactive", () => {
		expect(isCartItemProductNotPublic(createItem({ productActive: false }))).toBe(true);
	});

	it("should return false when product is active", () => {
		expect(isCartItemProductNotPublic(createItem({ productActive: true }))).toBe(false);
	});
});

describe("isCartItemZeroStock", () => {
	it("should return true when stock is 0", () => {
		expect(isCartItemZeroStock(createItem({ stock: 0 }))).toBe(true);
	});

	it("should return false when stock > 0", () => {
		expect(isCartItemZeroStock(createItem({ stock: 1 }))).toBe(false);
	});
});

describe("hasInsufficientStock", () => {
	it("should return true when stock < quantity but > 0", () => {
		expect(hasInsufficientStock(createItem({ stock: 2, quantity: 5 }))).toBe(true);
	});

	it("should return false when stock >= quantity", () => {
		expect(hasInsufficientStock(createItem({ stock: 5, quantity: 5 }))).toBe(false);
	});

	it("should return false when stock is 0 (handled by isCartItemZeroStock)", () => {
		expect(hasInsufficientStock(createItem({ stock: 0, quantity: 1 }))).toBe(false);
	});
});

// ============================================================================
// COMPOSITE CHECK FUNCTIONS
// ============================================================================

describe("isCartItemUnavailable", () => {
	it("should return true for inactive VARIANT", () => {
		expect(isCartItemUnavailable(createItem({ active: false }))).toBe(true);
	});

	it("should return true for non-public product", () => {
		expect(isCartItemUnavailable(createItem({ productActive: false }))).toBe(true);
	});

	it("should return true for insufficient stock", () => {
		expect(isCartItemUnavailable(createItem({ stock: 2, quantity: 5 }))).toBe(true);
	});

	it("should return true for out of stock", () => {
		expect(isCartItemUnavailable(createItem({ stock: 0, quantity: 1 }))).toBe(true);
	});

	it("should return false for available items", () => {
		expect(
			isCartItemUnavailable(
				createItem({ stock: 10, quantity: 2, active: true, productActive: true }),
			),
		).toBe(false);
	});
});

// ============================================================================
// checkCartItemAvailability
// ============================================================================

describe("checkCartItemAvailability", () => {
	it("should return available for valid items", () => {
		const result = checkCartItemAvailability(createItem());
		expect(result.isAvailable).toBe(true);
		expect(result.issue).toBeUndefined();
	});

	it("should detect inactive VARIANT", () => {
		const result = checkCartItemAvailability(createItem({ active: false }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("INACTIVE");
	});

	it("should detect non-public product", () => {
		const result = checkCartItemAvailability(createItem({ productActive: false }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("NOT_PUBLIC");
	});

	it("should detect out of stock", () => {
		const result = checkCartItemAvailability(createItem({ stock: 0 }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("OUT_OF_STOCK");
	});

	it("should detect insufficient stock", () => {
		const result = checkCartItemAvailability(createItem({ stock: 2, quantity: 5 }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("INSUFFICIENT_STOCK");
	});

	it("should include correct variantId in issue", () => {
		const result = checkCartItemAvailability(
			createItem({ variantId: "variant-42", active: false }),
		);
		expect(result.issue?.variantId).toBe("variant-42");
	});

	it("should include product title in issue", () => {
		const result = checkCartItemAvailability(
			createItem({ productTitle: "Collier Etoile", active: false }),
		);
		expect(result.issue?.productTitle).toBe("Collier Etoile");
	});

	it("should prioritize INACTIVE over OUT_OF_STOCK", () => {
		const result = checkCartItemAvailability(createItem({ active: false, stock: 0 }));
		expect(result.issue?.issueType).toBe("INACTIVE");
	});
});

// ============================================================================
// validateCartItems
// ============================================================================

describe("validateCartItems", () => {
	it("should return empty issues for all valid items", () => {
		const items = [createItem({ variantId: "v1" }), createItem({ variantId: "v2" })];
		expect(validateCartItems(items)).toEqual([]);
	});

	it("should return issues for unavailable items only", () => {
		const items = [
			createItem({ variantId: "v1", stock: 0 }),
			createItem({ variantId: "v2", stock: 10 }),
			createItem({ variantId: "v3", active: false }),
		];
		const issues = validateCartItems(items);
		expect(issues).toHaveLength(2);
		expect(issues.map((i) => i.variantId)).toEqual(["v1", "v3"]);
	});

	it("should return empty array for empty items list", () => {
		expect(validateCartItems([])).toEqual([]);
	});
});

// ============================================================================
// filterUnavailableItems
// ============================================================================

describe("filterUnavailableItems", () => {
	it("should return only unavailable items", () => {
		const items = [
			createItem({ variantId: "v1", stock: 0 }),
			createItem({ variantId: "v2", stock: 10 }),
			createItem({ variantId: "v3", active: false }),
		];
		const unavailable = filterUnavailableItems(items);
		expect(unavailable).toHaveLength(2);
		expect(unavailable.map((i) => i.variantId)).toEqual(["v1", "v3"]);
	});

	it("should return empty array when all items are available", () => {
		const items = [createItem({ variantId: "v1" }), createItem({ variantId: "v2" })];
		expect(filterUnavailableItems(items)).toEqual([]);
	});

	it("should return all items when none are available", () => {
		const items = [
			createItem({ variantId: "v1", active: false }),
			createItem({ variantId: "v2", stock: 0 }),
		];
		expect(filterUnavailableItems(items)).toHaveLength(2);
	});
});
