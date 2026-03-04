import { describe, it, expect } from "vitest";
import {
	wishlistProductSchema,
	addToWishlistSchema,
	removeFromWishlistSchema,
	toggleWishlistItemSchema,
} from "../wishlist.schemas";
import { VALID_CUID } from "@/test/factories";

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
