import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { useBottomBarHeight, _registry } from "../use-bottom-bar-height";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCssVar(): string {
	return document.documentElement.style.getPropertyValue("--bottom-bar-height");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useBottomBarHeight", () => {
	beforeEach(() => {
		// Clear the shared registry and CSS var before each test
		_registry.clear();
		document.documentElement.style.removeProperty("--bottom-bar-height");
	});

	afterEach(() => {
		_registry.clear();
		document.documentElement.style.removeProperty("--bottom-bar-height");
	});

	// -------------------------------------------------------------------------
	// CSS var management
	// -------------------------------------------------------------------------

	describe("CSS variable management", () => {
		it("sets --bottom-bar-height on root when enabled", () => {
			renderHook(() => useBottomBarHeight(60));
			expect(getCssVar()).toBe("60px");
		});

		it("removes --bottom-bar-height on unmount", () => {
			const { unmount } = renderHook(() => useBottomBarHeight(60));
			expect(getCssVar()).toBe("60px");

			unmount();

			expect(getCssVar()).toBe("");
		});

		it("does not set the CSS var when enabled=false", () => {
			renderHook(() => useBottomBarHeight(60, false));
			expect(getCssVar()).toBe("");
		});

		it("removes the registry entry when enabled transitions to false", () => {
			let enabled = true;
			const { rerender } = renderHook(() => useBottomBarHeight(60, enabled));
			expect(getCssVar()).toBe("60px");

			enabled = false;
			rerender();

			expect(getCssVar()).toBe("");
		});

		it("restores the CSS var when enabled transitions back to true", () => {
			let enabled = true;
			const { rerender } = renderHook(() => useBottomBarHeight(60, enabled));

			enabled = false;
			rerender();
			expect(getCssVar()).toBe("");

			enabled = true;
			rerender();
			expect(getCssVar()).toBe("60px");
		});
	});

	// -------------------------------------------------------------------------
	// Multiple bars — max height logic
	// -------------------------------------------------------------------------

	describe("multiple bars use max height", () => {
		it("uses the max height when two bars are registered", () => {
			renderHook(() => useBottomBarHeight(40));
			renderHook(() => useBottomBarHeight(80));

			expect(getCssVar()).toBe("80px");
		});

		it("falls back to the remaining bar height after one unmounts", () => {
			const { unmount: unmountFirst } = renderHook(() => useBottomBarHeight(40));
			renderHook(() => useBottomBarHeight(80));

			expect(getCssVar()).toBe("80px");

			unmountFirst();

			expect(getCssVar()).toBe("80px");
		});

		it("removes CSS var when all bars unmount", () => {
			const { unmount: unmountFirst } = renderHook(() => useBottomBarHeight(40));
			const { unmount: unmountSecond } = renderHook(() => useBottomBarHeight(80));

			unmountFirst();
			unmountSecond();

			expect(getCssVar()).toBe("");
		});
	});

	// -------------------------------------------------------------------------
	// Registry tracking
	// -------------------------------------------------------------------------

	describe("_registry", () => {
		it("registers exactly one entry per hook instance", () => {
			const sizeBefore = _registry.size;
			renderHook(() => useBottomBarHeight(50));
			expect(_registry.size).toBe(sizeBefore + 1);
		});

		it("removes the entry from the registry on unmount", () => {
			const { unmount } = renderHook(() => useBottomBarHeight(50));
			const sizeAfterMount = _registry.size;

			unmount();

			expect(_registry.size).toBe(sizeAfterMount - 1);
		});
	});
});
