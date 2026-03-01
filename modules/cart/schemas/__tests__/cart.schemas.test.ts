import { describe, it, expect, vi } from "vitest";

// Mock the cart constants so we don't pull in the full Prisma SELECT object
// that references generated types.
vi.mock("../constants/cart", () => ({
	MAX_QUANTITY_PER_ORDER: 10,
	MAX_CART_ITEMS: 50,
	GET_CART_SELECT: {},
	GET_CART_SUMMARY_SELECT: {},
}));

// Mock error-messages which re-imports MAX_QUANTITY_PER_ORDER from the same
// constants file.
vi.mock("../constants/error-messages", () => ({
	CART_ERROR_MESSAGES: {
		SKU_NOT_FOUND: "Produit introuvable",
		QUANTITY_MIN: "La quantite minimale est de 1",
		QUANTITY_MAX: "Quantite maximale : 10 par article.",
	},
}));

import { addToCartSchema, updateCartItemSchema, removeFromCartSchema } from "../cart.schemas";

// A valid cuid2 string (26 lowercase alphanumeric chars, starts with a letter).
const VALID_CUID = "clh1234567890abcdefghijklm";

// ============================================================================
// addToCartSchema
// ============================================================================

describe("addToCartSchema", () => {
	it("accepts a valid skuId and quantity 1", () => {
		const result = addToCartSchema.safeParse({
			skuId: VALID_CUID,
			quantity: 1,
		});
		expect(result.success).toBe(true);
	});

	it("defaults quantity to 1 when not provided", () => {
		const result = addToCartSchema.safeParse({ skuId: VALID_CUID });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.quantity).toBe(1);
		}
	});

	it("rejects quantity 0 (below minimum)", () => {
		const result = addToCartSchema.safeParse({
			skuId: VALID_CUID,
			quantity: 0,
		});
		expect(result.success).toBe(false);
	});

	it("rejects quantity greater than MAX_QUANTITY_PER_ORDER (10)", () => {
		const result = addToCartSchema.safeParse({
			skuId: VALID_CUID,
			quantity: 11,
		});
		expect(result.success).toBe(false);
	});

	it("accepts quantity exactly equal to MAX_QUANTITY_PER_ORDER (10)", () => {
		const result = addToCartSchema.safeParse({
			skuId: VALID_CUID,
			quantity: 10,
		});
		expect(result.success).toBe(true);
	});

	it("rejects a non-integer quantity (float)", () => {
		const result = addToCartSchema.safeParse({
			skuId: VALID_CUID,
			quantity: 1.5,
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid skuId format", () => {
		const result = addToCartSchema.safeParse({
			skuId: "not-a-cuid2",
			quantity: 1,
		});
		expect(result.success).toBe(false);
	});

	it("rejects an empty skuId", () => {
		const result = addToCartSchema.safeParse({ skuId: "", quantity: 1 });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// updateCartItemSchema
// ============================================================================

describe("updateCartItemSchema", () => {
	it("accepts a valid cartItemId and quantity", () => {
		const result = updateCartItemSchema.safeParse({
			cartItemId: VALID_CUID,
			quantity: 3,
		});
		expect(result.success).toBe(true);
	});

	it("rejects quantity 0 (below minimum)", () => {
		const result = updateCartItemSchema.safeParse({
			cartItemId: VALID_CUID,
			quantity: 0,
		});
		expect(result.success).toBe(false);
	});

	it("rejects quantity above MAX_QUANTITY_PER_ORDER (10)", () => {
		const result = updateCartItemSchema.safeParse({
			cartItemId: VALID_CUID,
			quantity: 11,
		});
		expect(result.success).toBe(false);
	});

	it("accepts quantity exactly equal to MAX_QUANTITY_PER_ORDER (10)", () => {
		const result = updateCartItemSchema.safeParse({
			cartItemId: VALID_CUID,
			quantity: 10,
		});
		expect(result.success).toBe(true);
	});

	it("rejects a non-integer quantity", () => {
		const result = updateCartItemSchema.safeParse({
			cartItemId: VALID_CUID,
			quantity: 2.5,
		});
		expect(result.success).toBe(false);
	});

	it("rejects an invalid cartItemId", () => {
		const result = updateCartItemSchema.safeParse({
			cartItemId: "invalid-id",
			quantity: 1,
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// removeFromCartSchema
// ============================================================================

describe("removeFromCartSchema", () => {
	it("accepts a valid cartItemId", () => {
		const result = removeFromCartSchema.safeParse({ cartItemId: VALID_CUID });
		expect(result.success).toBe(true);
	});

	it("rejects an invalid cartItemId", () => {
		const result = removeFromCartSchema.safeParse({
			cartItemId: "not-a-valid-cuid2",
		});
		expect(result.success).toBe(false);
	});

	it("rejects an empty cartItemId", () => {
		const result = removeFromCartSchema.safeParse({ cartItemId: "" });
		expect(result.success).toBe(false);
	});

	it("rejects when cartItemId is missing", () => {
		const result = removeFromCartSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});
