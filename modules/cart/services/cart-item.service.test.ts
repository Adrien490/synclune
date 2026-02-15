import { describe, it, expect } from "vitest";
import {
	getCartItemSubtotal,
	isCartItemOutOfStock,
	isCartItemInactive,
	hasCartItemIssue,
	getCartItemIssueLabel,
	hasCartItemDiscount,
	getCartItemDiscountPercent,
	getCartItemPrimaryImage,
} from "./cart-item.service";
import type { CartItem } from "../types/cart.types";

function createCartItem(overrides: Partial<{
	priceAtAdd: number;
	quantity: number;
	inventory: number;
	isActive: boolean;
	status: string;
	compareAtPrice: number | null;
	images: { id: string }[];
}>): CartItem {
	return {
		id: "item-1",
		quantity: overrides.quantity ?? 1,
		priceAtAdd: overrides.priceAtAdd ?? 2500,
		createdAt: new Date(),
		updatedAt: new Date(),
		sku: {
			id: "sku-1",
			sku: "SKU-001",
			priceInclTax: 2500,
			compareAtPrice: overrides.compareAtPrice ?? null,
			inventory: overrides.inventory ?? 10,
			isActive: overrides.isActive ?? true,
			product: {
				id: "prod-1",
				title: "Bracelet Lune",
				slug: "bracelet-lune",
				status: overrides.status ?? "PUBLIC",
			},
			images: (overrides.images ?? [{ id: "img-1", url: "/img.jpg", blurDataUrl: null, thumbnailUrl: null, altText: "alt", mediaType: "IMAGE", isPrimary: true }]) as CartItem["sku"]["images"],
			color: { id: "color-1", name: "Or", hex: "#FFD700" },
			material: { id: "mat-1", name: "Acier" },
			size: null,
		},
	} as CartItem;
}

describe("getCartItemSubtotal", () => {
	it("should calculate price * quantity", () => {
		expect(getCartItemSubtotal(createCartItem({ priceAtAdd: 2500, quantity: 3 }))).toBe(7500);
	});

	it("should return 0 for quantity 0", () => {
		expect(getCartItemSubtotal(createCartItem({ priceAtAdd: 2500, quantity: 0 }))).toBe(0);
	});

	it("should return price for quantity 1", () => {
		expect(getCartItemSubtotal(createCartItem({ priceAtAdd: 1500, quantity: 1 }))).toBe(1500);
	});
});

describe("isCartItemOutOfStock", () => {
	it("should return true when inventory < quantity", () => {
		expect(isCartItemOutOfStock(createCartItem({ inventory: 2, quantity: 5 }))).toBe(true);
	});

	it("should return true when inventory is 0", () => {
		expect(isCartItemOutOfStock(createCartItem({ inventory: 0, quantity: 1 }))).toBe(true);
	});

	it("should return false when inventory >= quantity", () => {
		expect(isCartItemOutOfStock(createCartItem({ inventory: 5, quantity: 5 }))).toBe(false);
	});

	it("should return false when inventory > quantity", () => {
		expect(isCartItemOutOfStock(createCartItem({ inventory: 10, quantity: 3 }))).toBe(false);
	});
});

describe("isCartItemInactive", () => {
	it("should return true when SKU is not active", () => {
		expect(isCartItemInactive(createCartItem({ isActive: false }))).toBe(true);
	});

	it("should return true when product is not PUBLIC", () => {
		expect(isCartItemInactive(createCartItem({ status: "DRAFT" }))).toBe(true);
	});

	it("should return true when both inactive and not public", () => {
		expect(isCartItemInactive(createCartItem({ isActive: false, status: "ARCHIVED" }))).toBe(true);
	});

	it("should return false when active and public", () => {
		expect(isCartItemInactive(createCartItem({ isActive: true, status: "PUBLIC" }))).toBe(false);
	});
});

describe("hasCartItemIssue", () => {
	it("should return true for out of stock items", () => {
		expect(hasCartItemIssue(createCartItem({ inventory: 0, quantity: 1 }))).toBe(true);
	});

	it("should return true for inactive items", () => {
		expect(hasCartItemIssue(createCartItem({ isActive: false }))).toBe(true);
	});

	it("should return true for non-public products", () => {
		expect(hasCartItemIssue(createCartItem({ status: "DRAFT" }))).toBe(true);
	});

	it("should return false for available items", () => {
		expect(hasCartItemIssue(createCartItem({}))).toBe(false);
	});
});

describe("getCartItemIssueLabel", () => {
	it("should return 'indisponible' for inactive SKU", () => {
		expect(getCartItemIssueLabel(createCartItem({ isActive: false }))).toBe("indisponible");
	});

	it("should return 'indisponible' for non-public product", () => {
		expect(getCartItemIssueLabel(createCartItem({ status: "DRAFT" }))).toBe("indisponible");
	});

	it("should return 'rupture' for out of stock", () => {
		expect(getCartItemIssueLabel(createCartItem({ inventory: 0, quantity: 1 }))).toBe("rupture");
	});

	it("should return 'rupture' for insufficient stock", () => {
		expect(getCartItemIssueLabel(createCartItem({ inventory: 2, quantity: 5 }))).toBe("rupture");
	});

	it("should prioritize 'indisponible' over 'rupture'", () => {
		expect(getCartItemIssueLabel(createCartItem({ isActive: false, inventory: 0 }))).toBe("indisponible");
	});

	it("should return null for available items", () => {
		expect(getCartItemIssueLabel(createCartItem({}))).toBeNull();
	});
});

describe("hasCartItemDiscount", () => {
	it("should return true when compareAtPrice > priceAtAdd", () => {
		expect(hasCartItemDiscount(createCartItem({ compareAtPrice: 3000, priceAtAdd: 2500 }))).toBe(true);
	});

	it("should return false when compareAtPrice is null", () => {
		expect(hasCartItemDiscount(createCartItem({ compareAtPrice: null }))).toBe(false);
	});

	it("should return false when compareAtPrice <= priceAtAdd", () => {
		expect(hasCartItemDiscount(createCartItem({ compareAtPrice: 2500, priceAtAdd: 2500 }))).toBe(false);
		expect(hasCartItemDiscount(createCartItem({ compareAtPrice: 2000, priceAtAdd: 2500 }))).toBe(false);
	});
});

describe("getCartItemDiscountPercent", () => {
	it("should calculate discount percentage", () => {
		expect(getCartItemDiscountPercent(createCartItem({ compareAtPrice: 5000, priceAtAdd: 2500 }))).toBe(50);
	});

	it("should round the percentage", () => {
		expect(getCartItemDiscountPercent(createCartItem({ compareAtPrice: 3000, priceAtAdd: 2000 }))).toBe(33);
	});

	it("should return 0 when no discount", () => {
		expect(getCartItemDiscountPercent(createCartItem({ compareAtPrice: null }))).toBe(0);
	});

	it("should return 0 when compareAtPrice <= priceAtAdd", () => {
		expect(getCartItemDiscountPercent(createCartItem({ compareAtPrice: 2500, priceAtAdd: 2500 }))).toBe(0);
	});
});

describe("getCartItemPrimaryImage", () => {
	it("should return the first image", () => {
		const image = { id: "img-1", url: "/img.jpg", blurDataUrl: null, thumbnailUrl: null, altText: "alt", mediaType: "IMAGE", isPrimary: true };
		const item = createCartItem({ images: [image] as unknown as { id: string }[] });
		expect(getCartItemPrimaryImage(item)).toEqual(image);
	});

	it("should return null when no images", () => {
		const item = createCartItem({ images: [] });
		expect(getCartItemPrimaryImage(item)).toBeNull();
	});
});
