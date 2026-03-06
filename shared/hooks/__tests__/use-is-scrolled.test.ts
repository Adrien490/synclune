import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { useIsScrolled } from "../use-is-scrolled";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setScrollY(value: number) {
	vi.stubGlobal("scrollY", value);
}

function triggerScroll() {
	act(() => {
		window.dispatchEvent(new Event("scroll"));
	});
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	setScrollY(0);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useIsScrolled", () => {
	// -------------------------------------------------------------------------
	// Initial state
	// -------------------------------------------------------------------------

	describe("initial state", () => {
		it("returns false when scrollY is 0 (default threshold 10)", () => {
			setScrollY(0);
			const { result } = renderHook(() => useIsScrolled());
			expect(result.current).toBe(false);
		});

		it("returns true immediately when scrollY is already above threshold at mount", () => {
			setScrollY(50);
			const { result } = renderHook(() => useIsScrolled(10));
			expect(result.current).toBe(true);
		});

		it("returns false when scrollY equals threshold exactly (strict >)", () => {
			setScrollY(10);
			const { result } = renderHook(() => useIsScrolled(10));
			expect(result.current).toBe(false);
		});

		it("returns false for large threshold when scrollY is 0 (fixes sentinel bug)", () => {
			setScrollY(0);
			const { result } = renderHook(() => useIsScrolled(1200));
			expect(result.current).toBe(false);
		});

		it("returns true when scrollY already exceeds a large threshold at mount", () => {
			setScrollY(1500);
			const { result } = renderHook(() => useIsScrolled(1200));
			expect(result.current).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// Scroll events
	// -------------------------------------------------------------------------

	describe("scroll events", () => {
		it("becomes true when scroll exceeds threshold", () => {
			setScrollY(0);
			const { result } = renderHook(() => useIsScrolled(10));
			expect(result.current).toBe(false);

			setScrollY(50);
			triggerScroll();

			expect(result.current).toBe(true);
		});

		it("reverts to false when scroll drops back below threshold", () => {
			setScrollY(50);
			const { result } = renderHook(() => useIsScrolled(10));
			expect(result.current).toBe(true);

			setScrollY(5);
			triggerScroll();

			expect(result.current).toBe(false);
		});

		it("stays false when scroll reaches exactly the threshold (strict >)", () => {
			setScrollY(0);
			const { result } = renderHook(() => useIsScrolled(10));

			setScrollY(10);
			triggerScroll();

			expect(result.current).toBe(false);
		});

		it("becomes true when scroll is one pixel above threshold", () => {
			setScrollY(0);
			const { result } = renderHook(() => useIsScrolled(10));

			setScrollY(11);
			triggerScroll();

			expect(result.current).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// Threshold changes
	// -------------------------------------------------------------------------

	describe("threshold changes", () => {
		it("re-evaluates immediately when threshold decreases below current scrollY", () => {
			setScrollY(15);
			let threshold = 20;
			const { result, rerender } = renderHook(() => useIsScrolled(threshold));

			// scrollY=15 < threshold=20 → false
			expect(result.current).toBe(false);

			threshold = 10;
			rerender();

			// scrollY=15 > threshold=10 → true
			expect(result.current).toBe(true);
		});

		it("re-evaluates immediately when threshold increases above current scrollY", () => {
			setScrollY(15);
			let threshold = 10;
			const { result, rerender } = renderHook(() => useIsScrolled(threshold));

			expect(result.current).toBe(true);

			threshold = 20;
			rerender();

			expect(result.current).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// Cleanup on unmount
	// -------------------------------------------------------------------------

	describe("cleanup on unmount", () => {
		it("removes the scroll event listener on unmount", () => {
			const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
			const { unmount } = renderHook(() => useIsScrolled(10));

			unmount();

			expect(removeEventListenerSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
			removeEventListenerSpy.mockRestore();
		});

		it("does not update state after unmount", () => {
			setScrollY(0);
			const { result, unmount } = renderHook(() => useIsScrolled(10));

			unmount();

			// Triggering scroll after unmount should not cause state update errors
			expect(() => {
				setScrollY(50);
				triggerScroll();
			}).not.toThrow();

			// State remains as it was at unmount time
			expect(result.current).toBe(false);
		});
	});
});
