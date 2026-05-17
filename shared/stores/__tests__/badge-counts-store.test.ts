import { describe, it, expect, beforeEach } from "vitest";

import { useBadgeCountsStore } from "../badge-counts-store";

describe("useBadgeCountsStore", () => {
	beforeEach(() => {
		useBadgeCountsStore.setState({
			wishlistCount: 0,
			cartCount: 0,
			wishlistBump: null,
			cartBump: null,
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

		it("should clear bump descriptors", () => {
			useBadgeCountsStore.getState().adjustCart(2);
			useBadgeCountsStore.getState().incrementWishlist();
			useBadgeCountsStore.getState().reset();
			expect(useBadgeCountsStore.getState().cartBump).toBeNull();
			expect(useBadgeCountsStore.getState().wishlistBump).toBeNull();
		});
	});

	// ============================================================================
	// BUMP TRACKING — used by <CountBadge> to render the floating "+N" flash.
	// Hydration (`set*Count`) must NOT publish a bump, otherwise an SSR-rendered
	// page with a non-empty cart would flash "+N" on every reload.
	// ============================================================================
	describe("bump tracking", () => {
		it("adjustCart with positive delta sets cartBump with delta and increasing key", () => {
			const before = useBadgeCountsStore.getState().cartBump;
			expect(before).toBeNull();
			useBadgeCountsStore.getState().adjustCart(3);
			const after = useBadgeCountsStore.getState().cartBump;
			expect(after?.delta).toBe(3);
			expect(typeof after?.key).toBe("number");
		});

		it("adjustCart with negative delta still publishes the bump (consumer filters positive only)", () => {
			useBadgeCountsStore.getState().setCartCount(5);
			useBadgeCountsStore.getState().adjustCart(-2);
			expect(useBadgeCountsStore.getState().cartBump?.delta).toBe(-2);
		});

		it("adjustCart(0) does not publish a new bump", () => {
			useBadgeCountsStore.setState({ cartBump: { delta: 1, key: 100 } });
			useBadgeCountsStore.getState().adjustCart(0);
			expect(useBadgeCountsStore.getState().cartBump?.key).toBe(100);
		});

		it("incrementWishlist publishes a +1 wishlistBump", () => {
			useBadgeCountsStore.getState().incrementWishlist();
			expect(useBadgeCountsStore.getState().wishlistBump?.delta).toBe(1);
		});

		it("decrementWishlist publishes a -1 wishlistBump", () => {
			useBadgeCountsStore.getState().setWishlistCount(3);
			useBadgeCountsStore.getState().decrementWishlist();
			expect(useBadgeCountsStore.getState().wishlistBump?.delta).toBe(-1);
		});

		it("setCartCount (server hydration) does NOT publish a bump", () => {
			useBadgeCountsStore.getState().setCartCount(10);
			expect(useBadgeCountsStore.getState().cartBump).toBeNull();
		});

		it("setWishlistCount (server hydration) does NOT publish a bump", () => {
			useBadgeCountsStore.getState().setWishlistCount(10);
			expect(useBadgeCountsStore.getState().wishlistBump).toBeNull();
		});

		it("successive adjustCart calls produce distinct keys", async () => {
			useBadgeCountsStore.getState().adjustCart(1);
			const firstKey = useBadgeCountsStore.getState().cartBump?.key ?? 0;
			// Date.now() granularity is 1ms — yield to advance the clock.
			await new Promise((r) => setTimeout(r, 2));
			useBadgeCountsStore.getState().adjustCart(1);
			const secondKey = useBadgeCountsStore.getState().cartBump?.key ?? 0;
			expect(secondKey).toBeGreaterThan(firstKey);
		});
	});
});
