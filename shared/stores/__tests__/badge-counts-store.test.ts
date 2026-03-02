import { describe, it, expect, beforeEach } from "vitest";

import { useBadgeCountsStore } from "../badge-counts-store";

describe("useBadgeCountsStore", () => {
	beforeEach(() => {
		useBadgeCountsStore.setState({
			wishlistCount: 0,
			cartCount: 0,
		});
	});

	describe("initial state", () => {
		it("should have wishlistCount = 0", () => {
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(0);
		});

		it("should have cartCount = 0", () => {
			expect(useBadgeCountsStore.getState().cartCount).toBe(0);
		});
	});

	describe("setWishlistCount", () => {
		it("should set wishlist count to given value", () => {
			useBadgeCountsStore.getState().setWishlistCount(5);
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(5);
		});

		it("should not affect cartCount", () => {
			useBadgeCountsStore.getState().setCartCount(3);
			useBadgeCountsStore.getState().setWishlistCount(7);
			expect(useBadgeCountsStore.getState().cartCount).toBe(3);
		});
	});

	describe("setCartCount", () => {
		it("should set cart count to given value", () => {
			useBadgeCountsStore.getState().setCartCount(10);
			expect(useBadgeCountsStore.getState().cartCount).toBe(10);
		});

		it("should not affect wishlistCount", () => {
			useBadgeCountsStore.getState().setWishlistCount(2);
			useBadgeCountsStore.getState().setCartCount(8);
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(2);
		});
	});

	describe("incrementWishlist", () => {
		it("should increment wishlist count by 1", () => {
			useBadgeCountsStore.getState().incrementWishlist();
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(1);
		});

		it("should increment from existing value", () => {
			useBadgeCountsStore.getState().setWishlistCount(3);
			useBadgeCountsStore.getState().incrementWishlist();
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(4);
		});
	});

	describe("decrementWishlist", () => {
		it("should decrement wishlist count by 1", () => {
			useBadgeCountsStore.getState().setWishlistCount(3);
			useBadgeCountsStore.getState().decrementWishlist();
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(2);
		});

		it("should not go below 0", () => {
			useBadgeCountsStore.getState().decrementWishlist();
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(0);
		});

		it("should clamp at 0 when already at 0", () => {
			useBadgeCountsStore.getState().setWishlistCount(0);
			useBadgeCountsStore.getState().decrementWishlist();
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(0);
		});
	});

	describe("adjustCart", () => {
		it("should add positive delta", () => {
			useBadgeCountsStore.getState().adjustCart(3);
			expect(useBadgeCountsStore.getState().cartCount).toBe(3);
		});

		it("should subtract negative delta", () => {
			useBadgeCountsStore.getState().setCartCount(5);
			useBadgeCountsStore.getState().adjustCart(-2);
			expect(useBadgeCountsStore.getState().cartCount).toBe(3);
		});

		it("should not go below 0 with negative delta", () => {
			useBadgeCountsStore.getState().setCartCount(2);
			useBadgeCountsStore.getState().adjustCart(-5);
			expect(useBadgeCountsStore.getState().cartCount).toBe(0);
		});

		it("should handle delta of 0", () => {
			useBadgeCountsStore.getState().setCartCount(4);
			useBadgeCountsStore.getState().adjustCart(0);
			expect(useBadgeCountsStore.getState().cartCount).toBe(4);
		});
	});

	describe("reset", () => {
		it("should reset both counts to 0", () => {
			useBadgeCountsStore.getState().setWishlistCount(5);
			useBadgeCountsStore.getState().setCartCount(3);
			useBadgeCountsStore.getState().reset();
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(0);
			expect(useBadgeCountsStore.getState().cartCount).toBe(0);
		});

		it("should reset counts that were adjusted via increment/adjust", () => {
			useBadgeCountsStore.getState().incrementWishlist();
			useBadgeCountsStore.getState().incrementWishlist();
			useBadgeCountsStore.getState().adjustCart(7);
			useBadgeCountsStore.getState().reset();
			expect(useBadgeCountsStore.getState().wishlistCount).toBe(0);
			expect(useBadgeCountsStore.getState().cartCount).toBe(0);
		});
	});
});
