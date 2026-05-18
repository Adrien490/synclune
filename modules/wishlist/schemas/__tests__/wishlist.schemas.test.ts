import { describe, it, expect } from "vitest";
import {
	wishlistProductSchema,
	addToWishlistSchema,
	removeFromWishlistSchema,
	toggleWishlistItemSchema,
	moveToCartSchema,
} from "../wishlist.schemas";
import { VALID_CUID } from "@/test/factories";
import { MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";

const SECOND_VALID_CUID = "cm9876543210zyxwvutsrqp34";

describe("wishlistProductSchema", () => {
	it("should accept a valid cuid2 productId", () => {
		const result = wishlistProductSchema.safeParse({ productId: VALID_CUID });

		expect(result.success).toBe(true);
	});

	it("should reject missing productId", () => {
		const result = wishlistProductSchema.safeParse({});

		expect(result.success).toBe(false);
	});

	it("should reject empty productId", () => {
		const result = wishlistProductSchema.safeParse({ productId: "" });

		expect(result.success).toBe(false);
	});
});

describe("schema aliases", () => {
	it("addToWishlistSchema should be the same as wishlistProductSchema", () => {
		expect(addToWishlistSchema).toBe(wishlistProductSchema);
	});

	it("removeFromWishlistSchema should be the same as wishlistProductSchema", () => {
		expect(removeFromWishlistSchema).toBe(wishlistProductSchema);
	});

	it("toggleWishlistItemSchema should be the same as wishlistProductSchema", () => {
		expect(toggleWishlistItemSchema).toBe(wishlistProductSchema);
	});
});

describe("moveToCartSchema", () => {
	it("accepts valid productId + skuId + quantity", () => {
		const result = moveToCartSchema.safeParse({
			productId: VALID_CUID,
			skuId: SECOND_VALID_CUID,
			quantity: 2,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.quantity).toBe(2);
		}
	});

	it("defaults quantity to 1 when omitted", () => {
		const result = moveToCartSchema.safeParse({
			productId: VALID_CUID,
			skuId: SECOND_VALID_CUID,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.quantity).toBe(1);
		}
	});

	it("rejects missing skuId", () => {
		const result = moveToCartSchema.safeParse({
			productId: VALID_CUID,
			quantity: 1,
		});

		expect(result.success).toBe(false);
	});

	it("rejects missing productId", () => {
		const result = moveToCartSchema.safeParse({
			skuId: SECOND_VALID_CUID,
			quantity: 1,
		});

		expect(result.success).toBe(false);
	});

	it("rejects invalid cuid2 for skuId", () => {
		const result = moveToCartSchema.safeParse({
			productId: VALID_CUID,
			skuId: "not-a-cuid",
			quantity: 1,
		});

		expect(result.success).toBe(false);
	});

	it("rejects quantity < 1", () => {
		const result = moveToCartSchema.safeParse({
			productId: VALID_CUID,
			skuId: SECOND_VALID_CUID,
			quantity: 0,
		});

		expect(result.success).toBe(false);
	});

	it(`rejects quantity > MAX_QUANTITY_PER_ORDER (${MAX_QUANTITY_PER_ORDER})`, () => {
		const result = moveToCartSchema.safeParse({
			productId: VALID_CUID,
			skuId: SECOND_VALID_CUID,
			quantity: MAX_QUANTITY_PER_ORDER + 1,
		});

		expect(result.success).toBe(false);
	});

	it("rejects non-integer quantity", () => {
		const result = moveToCartSchema.safeParse({
			productId: VALID_CUID,
			skuId: SECOND_VALID_CUID,
			quantity: 1.5,
		});

		expect(result.success).toBe(false);
	});
});
