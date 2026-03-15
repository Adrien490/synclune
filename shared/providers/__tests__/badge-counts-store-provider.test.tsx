import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { BadgeCountsStoreProvider } from "../badge-counts-store-provider";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

afterEach(cleanup);

function TestConsumer() {
	const wishlistCount = useBadgeCountsStore((s) => s.wishlistCount);
	const cartCount = useBadgeCountsStore((s) => s.cartCount);

	return (
		<div>
			<span data-testid="wishlist">{wishlistCount}</span>
			<span data-testid="cart">{cartCount}</span>
		</div>
	);
}

describe("BadgeCountsStoreProvider", () => {
	beforeEach(() => {
		useBadgeCountsStore.getState().reset();
	});

	it("hydrates the store with initial server values", () => {
		render(
			<BadgeCountsStoreProvider initialWishlistCount={3} initialCartCount={5}>
				<TestConsumer />
			</BadgeCountsStoreProvider>,
		);

		expect(screen.getByTestId("wishlist")).toHaveTextContent("3");
		expect(screen.getByTestId("cart")).toHaveTextContent("5");
	});

	it("resyncs when server values change", () => {
		const { rerender } = render(
			<BadgeCountsStoreProvider initialWishlistCount={2} initialCartCount={1}>
				<TestConsumer />
			</BadgeCountsStoreProvider>,
		);

		expect(screen.getByTestId("wishlist")).toHaveTextContent("2");
		expect(screen.getByTestId("cart")).toHaveTextContent("1");

		rerender(
			<BadgeCountsStoreProvider initialWishlistCount={5} initialCartCount={3}>
				<TestConsumer />
			</BadgeCountsStoreProvider>,
		);

		expect(screen.getByTestId("wishlist")).toHaveTextContent("5");
		expect(screen.getByTestId("cart")).toHaveTextContent("3");
	});

	it("does not update store when values are unchanged", () => {
		const setWishlistSpy = vi.spyOn(useBadgeCountsStore.getState(), "setWishlistCount");
		const setCartSpy = vi.spyOn(useBadgeCountsStore.getState(), "setCartCount");

		const { rerender } = render(
			<BadgeCountsStoreProvider initialWishlistCount={2} initialCartCount={1}>
				<TestConsumer />
			</BadgeCountsStoreProvider>,
		);

		expect(setWishlistSpy).toHaveBeenCalledWith(2);
		expect(setCartSpy).toHaveBeenCalledWith(1);

		setWishlistSpy.mockClear();
		setCartSpy.mockClear();

		rerender(
			<BadgeCountsStoreProvider initialWishlistCount={2} initialCartCount={1}>
				<TestConsumer />
			</BadgeCountsStoreProvider>,
		);

		expect(setWishlistSpy).not.toHaveBeenCalled();
		expect(setCartSpy).not.toHaveBeenCalled();

		setWishlistSpy.mockRestore();
		setCartSpy.mockRestore();
	});

	it("renders children", () => {
		render(
			<BadgeCountsStoreProvider initialWishlistCount={0} initialCartCount={0}>
				<div data-testid="child">hello</div>
			</BadgeCountsStoreProvider>,
		);

		expect(screen.getByTestId("child")).toHaveTextContent("hello");
	});
});
