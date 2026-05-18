import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import {
	WishlistListOptimisticContext,
	useWishlistListOptimistic,
	type WishlistListOptimisticContextValue,
} from "../wishlist-list-optimistic-context";

// ============================================================================
// Helpers
// ============================================================================

const mockContextValue: WishlistListOptimisticContextValue = {
	onItemRemoved: vi.fn(),
	tombstones: new Map(),
	markAsTombstone: vi.fn(),
	cancelTombstone: vi.fn(),
};

function withProvider(value: WishlistListOptimisticContextValue) {
	const Wrapper = ({ children }: { children: React.ReactNode }) => (
		<WishlistListOptimisticContext.Provider value={value}>
			{children}
		</WishlistListOptimisticContext.Provider>
	);
	Wrapper.displayName = "WishlistOptimisticTestWrapper";
	return Wrapper;
}

// ============================================================================
// useWishlistListOptimistic
// ============================================================================

describe("useWishlistListOptimistic", () => {
	it("returns null outside provider", () => {
		const { result } = renderHook(() => useWishlistListOptimistic());

		expect(result.current).toBeNull();
	});

	it("returns context value inside provider", () => {
		const { result } = renderHook(() => useWishlistListOptimistic(), {
			wrapper: withProvider(mockContextValue),
		});

		expect(result.current).toBe(mockContextValue);
		expect(typeof result.current?.onItemRemoved).toBe("function");
	});
});
