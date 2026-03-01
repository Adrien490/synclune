import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// IntersectionObserver mock
// ---------------------------------------------------------------------------

type IOCallback = (entries: IntersectionObserverEntry[]) => void;

let observerCallback: IOCallback | null = null;
let observedElement: Element | null = null;
const mockObserve = vi.fn((el: Element) => {
	observedElement = el;
});
const mockDisconnect = vi.fn();

function MockIntersectionObserver(callback: IOCallback) {
	observerCallback = callback;
	return {
		observe: mockObserve,
		disconnect: mockDisconnect,
	};
}

beforeEach(() => {
	observerCallback = null;
	observedElement = null;
	mockObserve.mockClear();
	mockDisconnect.mockClear();
	vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
	// Default: not scrolled
	vi.stubGlobal("scrollY", 0);
});

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// Import under test (after stubs are set up)
// ---------------------------------------------------------------------------

import { useIsScrolled } from "../use-is-scrolled";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function triggerIntersection(isIntersecting: boolean) {
	if (!observerCallback) throw new Error("IntersectionObserver callback not registered");
	act(() => {
		observerCallback!([{ isIntersecting } as IntersectionObserverEntry]);
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useIsScrolled", () => {
	// -------------------------------------------------------------------------
	// Initial state
	// -------------------------------------------------------------------------

	describe("initial state", () => {
		it("returns false initially when scrollY is 0 (below threshold)", () => {
			vi.stubGlobal("scrollY", 0);
			const { result } = renderHook(() => useIsScrolled(10));
			expect(result.current).toBe(false);
		});

		it("returns false initially even when scrollY is already above threshold (state initialized via IntersectionObserver, not scrollY)", () => {
			vi.stubGlobal("scrollY", 50);
			const { result } = renderHook(() => useIsScrolled(10));
			expect(result.current).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// Sentinel creation
	// -------------------------------------------------------------------------

	describe("sentinel element", () => {
		it("creates a sentinel element and appends it to the body", () => {
			renderHook(() => useIsScrolled(10));

			const sentinels = document.body.querySelectorAll("[aria-hidden='true']");
			expect(sentinels.length).toBeGreaterThan(0);
		});

		it("passes the sentinel to IntersectionObserver.observe", () => {
			renderHook(() => useIsScrolled(10));
			expect(mockObserve).toHaveBeenCalledTimes(1);
			expect(observedElement).not.toBeNull();
		});
	});

	// -------------------------------------------------------------------------
	// IntersectionObserver behavior
	// -------------------------------------------------------------------------

	describe("IntersectionObserver callback", () => {
		it("returns true when the sentinel is not intersecting (scrolled past threshold)", () => {
			const { result } = renderHook(() => useIsScrolled(10));

			triggerIntersection(false);

			expect(result.current).toBe(true);
		});

		it("returns false when the sentinel is intersecting (not scrolled past threshold)", () => {
			const { result } = renderHook(() => useIsScrolled(10));

			triggerIntersection(true);

			expect(result.current).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// Cleanup on unmount
	// -------------------------------------------------------------------------

	describe("cleanup on unmount", () => {
		it("disconnects the observer on unmount", () => {
			const { unmount } = renderHook(() => useIsScrolled(10));
			unmount();

			expect(mockDisconnect).toHaveBeenCalledTimes(1);
		});

		it("removes the sentinel element from the body on unmount", () => {
			const { unmount } = renderHook(() => useIsScrolled(10));

			const beforeUnmount = document.body.querySelectorAll("[aria-hidden='true']").length;
			expect(beforeUnmount).toBeGreaterThan(0);

			unmount();

			const afterUnmount = document.body.querySelectorAll("[aria-hidden='true']").length;
			expect(afterUnmount).toBe(beforeUnmount - 1);
		});
	});
});
