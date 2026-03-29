import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import {
	CartOptimisticContext,
	useCartOptimistic,
	useCartOptimisticSafe,
	type CartOptimisticContextValue,
} from "../cart-optimistic-context";

// ============================================================================
// Helpers
// ============================================================================

const mockContextValue: CartOptimisticContextValue = {
	updateOptimisticCart: vi.fn(),
	isPending: false,
	startTransition: vi.fn() as React.TransitionStartFunction,
};

function withProvider(value: CartOptimisticContextValue) {
	const Wrapper = ({ children }: { children: React.ReactNode }) => (
		<CartOptimisticContext.Provider value={value}>{children}</CartOptimisticContext.Provider>
	);
	Wrapper.displayName = "CartOptimisticTestWrapper";
	return Wrapper;
}

// ============================================================================
// useCartOptimistic
// ============================================================================

describe("useCartOptimistic", () => {
	it("throws when used outside CartOptimisticProvider", () => {
		// Suppress console.error from React's caught error reporting
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => {
			renderHook(() => useCartOptimistic());
		}).toThrow("useCartOptimistic must be used within CartOptimisticProvider");

		spy.mockRestore();
	});

	it("returns context value when inside provider", () => {
		const { result } = renderHook(() => useCartOptimistic(), {
			wrapper: withProvider(mockContextValue),
		});

		expect(result.current).toBe(mockContextValue);
		expect(result.current.isPending).toBe(false);
		expect(typeof result.current.updateOptimisticCart).toBe("function");
		expect(typeof result.current.startTransition).toBe("function");
	});
});

// ============================================================================
// useCartOptimisticSafe
// ============================================================================

describe("useCartOptimisticSafe", () => {
	it("returns null outside provider", () => {
		const { result } = renderHook(() => useCartOptimisticSafe());

		expect(result.current).toBeNull();
	});

	it("returns context value inside provider", () => {
		const { result } = renderHook(() => useCartOptimisticSafe(), {
			wrapper: withProvider(mockContextValue),
		});

		expect(result.current).toBe(mockContextValue);
		expect(result.current?.isPending).toBe(false);
	});
});
