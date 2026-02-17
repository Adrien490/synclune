import { describe, it, expect } from "vitest";
import {
	isCartItemDeleted,
	isCartItemSkuInactive,
	isCartItemProductNotPublic,
	isCartItemZeroStock,
	hasInsufficientStock,
	isCartItemUnavailable,
	checkCartItemAvailability,
	validateCartItems,
	filterUnavailableItems,
} from "./item-availability.service";
import type { CartItemForValidation } from "../types/cart.types";

function createItem(overrides?: Partial<{
	id: string;
	skuId: string;
	quantity: number;
	inventory: number;
	isActive: boolean;
	status: string;
	deletedAt: Date | null;
	productDeletedAt: Date | null;
	productTitle: string;
}>): CartItemForValidation {
	return {
		id: overrides?.id ?? "item-1",
		skuId: overrides?.skuId ?? "sku-1",
		quantity: overrides?.quantity ?? 1,
		sku: {
			id: overrides?.skuId ?? "sku-1",
			isActive: overrides?.isActive ?? true,
			inventory: overrides?.inventory ?? 10,
			deletedAt: overrides?.deletedAt ?? null,
			product: {
				id: "prod-1",
				title: overrides?.productTitle ?? "Bracelet Lune",
				status: overrides?.status ?? "PUBLIC",
				deletedAt: overrides?.productDeletedAt ?? null,
			},
		},
	};
}

// ============================================================================
// INDIVIDUAL CHECK FUNCTIONS
// ============================================================================

describe("isCartItemDeleted", () => {
	it("should return true when SKU is soft-deleted", () => {
		expect(isCartItemDeleted(createItem({ deletedAt: new Date() }))).toBe(true);
	});

	it("should return true when product is soft-deleted", () => {
		expect(isCartItemDeleted(createItem({ productDeletedAt: new Date() }))).toBe(true);
	});

	it("should return true when both are soft-deleted", () => {
		expect(isCartItemDeleted(createItem({ deletedAt: new Date(), productDeletedAt: new Date() }))).toBe(true);
	});

	it("should return false when neither is deleted", () => {
		expect(isCartItemDeleted(createItem())).toBe(false);
	});
});

describe("isCartItemSkuInactive", () => {
	it("should return true when SKU is inactive", () => {
		expect(isCartItemSkuInactive(createItem({ isActive: false }))).toBe(true);
	});

	it("should return false when SKU is active", () => {
		expect(isCartItemSkuInactive(createItem({ isActive: true }))).toBe(false);
	});
});

describe("isCartItemProductNotPublic", () => {
	it("should return true for DRAFT status", () => {
		expect(isCartItemProductNotPublic(createItem({ status: "DRAFT" }))).toBe(true);
	});

	it("should return true for ARCHIVED status", () => {
		expect(isCartItemProductNotPublic(createItem({ status: "ARCHIVED" }))).toBe(true);
	});

	it("should return false for PUBLIC status", () => {
		expect(isCartItemProductNotPublic(createItem({ status: "PUBLIC" }))).toBe(false);
	});
});

describe("isCartItemZeroStock", () => {
	it("should return true when inventory is 0", () => {
		expect(isCartItemZeroStock(createItem({ inventory: 0 }))).toBe(true);
	});

	it("should return false when inventory > 0", () => {
		expect(isCartItemZeroStock(createItem({ inventory: 1 }))).toBe(false);
	});
});

describe("hasInsufficientStock", () => {
	it("should return true when inventory < quantity but > 0", () => {
		expect(hasInsufficientStock(createItem({ inventory: 2, quantity: 5 }))).toBe(true);
	});

	it("should return false when inventory >= quantity", () => {
		expect(hasInsufficientStock(createItem({ inventory: 5, quantity: 5 }))).toBe(false);
	});

	it("should return false when inventory is 0 (handled by isCartItemZeroStock)", () => {
		expect(hasInsufficientStock(createItem({ inventory: 0, quantity: 1 }))).toBe(false);
	});
});

// ============================================================================
// COMPOSITE CHECK FUNCTIONS
// ============================================================================

describe("isCartItemUnavailable", () => {
	it("should return true for deleted items", () => {
		expect(isCartItemUnavailable(createItem({ deletedAt: new Date() }))).toBe(true);
	});

	it("should return true for inactive SKU", () => {
		expect(isCartItemUnavailable(createItem({ isActive: false }))).toBe(true);
	});

	it("should return true for non-public product", () => {
		expect(isCartItemUnavailable(createItem({ status: "DRAFT" }))).toBe(true);
	});

	it("should return true for insufficient stock", () => {
		expect(isCartItemUnavailable(createItem({ inventory: 2, quantity: 5 }))).toBe(true);
	});

	it("should return true for out of stock", () => {
		expect(isCartItemUnavailable(createItem({ inventory: 0, quantity: 1 }))).toBe(true);
	});

	it("should return false for available items", () => {
		expect(isCartItemUnavailable(createItem({ inventory: 10, quantity: 2, isActive: true, status: "PUBLIC" }))).toBe(false);
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

	it("should detect deleted SKU", () => {
		const result = checkCartItemAvailability(createItem({ deletedAt: new Date() }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("DELETED");
	});

	it("should detect deleted product", () => {
		const result = checkCartItemAvailability(createItem({ productDeletedAt: new Date() }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("DELETED");
	});

	it("should detect inactive SKU", () => {
		const result = checkCartItemAvailability(createItem({ isActive: false }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("INACTIVE");
	});

	it("should detect non-public product", () => {
		const result = checkCartItemAvailability(createItem({ status: "DRAFT" }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("NOT_PUBLIC");
	});

	it("should detect out of stock", () => {
		const result = checkCartItemAvailability(createItem({ inventory: 0 }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("OUT_OF_STOCK");
		expect(result.issue?.availableStock).toBe(0);
	});

	it("should detect insufficient stock", () => {
		const result = checkCartItemAvailability(createItem({ inventory: 2, quantity: 5 }));
		expect(result.isAvailable).toBe(false);
		expect(result.issue?.issueType).toBe("INSUFFICIENT_STOCK");
		expect(result.issue?.availableStock).toBe(2);
	});

	it("should include correct cartItemId and skuId in issue", () => {
		const result = checkCartItemAvailability(createItem({ id: "ci-42", skuId: "sku-42", isActive: false }));
		expect(result.issue?.cartItemId).toBe("ci-42");
		expect(result.issue?.skuId).toBe("sku-42");
	});

	it("should include product title in issue", () => {
		const result = checkCartItemAvailability(createItem({ productTitle: "Collier Etoile", isActive: false }));
		expect(result.issue?.productTitle).toBe("Collier Etoile");
	});

	it("should prioritize DELETED over INACTIVE", () => {
		const result = checkCartItemAvailability(createItem({ deletedAt: new Date(), isActive: false }));
		expect(result.issue?.issueType).toBe("DELETED");
	});

	it("should prioritize INACTIVE over OUT_OF_STOCK", () => {
		const result = checkCartItemAvailability(createItem({ isActive: false, inventory: 0 }));
		expect(result.issue?.issueType).toBe("INACTIVE");
	});
});

// ============================================================================
// validateCartItems
// ============================================================================

describe("validateCartItems", () => {
	it("should return empty issues for all valid items", () => {
		const items = [createItem({ id: "i1" }), createItem({ id: "i2" })];
		expect(validateCartItems(items)).toEqual([]);
	});

	it("should return issues for unavailable items only", () => {
		const items = [
			createItem({ id: "i1", inventory: 0 }),
			createItem({ id: "i2", inventory: 10 }),
			createItem({ id: "i3", isActive: false }),
		];
		const issues = validateCartItems(items);
		expect(issues).toHaveLength(2);
		expect(issues.map((i) => i.cartItemId)).toEqual(["i1", "i3"]);
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
			createItem({ id: "i1", inventory: 0 }),
			createItem({ id: "i2", inventory: 10 }),
			createItem({ id: "i3", isActive: false }),
		];
		const unavailable = filterUnavailableItems(items);
		expect(unavailable).toHaveLength(2);
		expect(unavailable.map((i) => i.id)).toEqual(["i1", "i3"]);
	});

	it("should return empty array when all items are available", () => {
		const items = [createItem({ id: "i1" }), createItem({ id: "i2" })];
		expect(filterUnavailableItems(items)).toEqual([]);
	});

	it("should return all items when none are available", () => {
		const items = [
			createItem({ id: "i1", isActive: false }),
			createItem({ id: "i2", inventory: 0 }),
		];
		expect(filterUnavailableItems(items)).toHaveLength(2);
	});
});
