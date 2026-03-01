import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { usePulseOnChange } from "../use-pulse-on-change";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePulseOnChange", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// Initial state
	// -------------------------------------------------------------------------

	describe("initial state", () => {
		it("returns false initially", () => {
			const { result } = renderHook(() => usePulseOnChange("initial"));
			expect(result.current).toBe(false);
		});

		it("returns false initially with a numeric value", () => {
			const { result } = renderHook(() => usePulseOnChange(0));
			expect(result.current).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// Pulse on value change
	// -------------------------------------------------------------------------

	describe("pulse on value change", () => {
		it("returns true immediately when the value changes", () => {
			let value = "a";
			const { result, rerender } = renderHook(() => usePulseOnChange(value));

			expect(result.current).toBe(false);

			value = "b";
			rerender();

			expect(result.current).toBe(true);
		});

		it("resets to false after the default duration (600ms)", () => {
			let value = 1;
			const { result, rerender } = renderHook(() => usePulseOnChange(value));

			value = 2;
			rerender();
			expect(result.current).toBe(true);

			act(() => {
				vi.advanceTimersByTime(600);
			});

			expect(result.current).toBe(false);
		});

		it("resets to false after a custom duration", () => {
			let value = "x";
			const { result, rerender } = renderHook(() => usePulseOnChange(value, 300));

			value = "y";
			rerender();
			expect(result.current).toBe(true);

			act(() => {
				vi.advanceTimersByTime(299);
			});
			expect(result.current).toBe(true);

			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(result.current).toBe(false);
		});

		it("does not pulse when the same value is re-rendered", () => {
			const { result, rerender } = renderHook(() => usePulseOnChange("same"));

			rerender();
			rerender();

			expect(result.current).toBe(false);
		});

		it("restarts the timer when value changes again during a pulse", () => {
			let value = 1;
			const { result, rerender } = renderHook(() => usePulseOnChange(value, 600));

			value = 2;
			rerender();
			expect(result.current).toBe(true);

			act(() => {
				vi.advanceTimersByTime(400);
			});

			// Change value again mid-pulse
			value = 3;
			rerender();
			expect(result.current).toBe(true);

			// Original timer would have fired at 600ms total, but it was cleared.
			// New timer fires at 400 + 600 = 1000ms total.
			act(() => {
				vi.advanceTimersByTime(200);
			});
			// Only 600ms elapsed since first change, but second timer is at 400ms only
			expect(result.current).toBe(true);

			act(() => {
				vi.advanceTimersByTime(400);
			});
			expect(result.current).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// Cleanup on unmount
	// -------------------------------------------------------------------------

	describe("cleanup on unmount", () => {
		it("does not throw when unmounted during a pulse", () => {
			let value = "a";
			const { rerender, unmount } = renderHook(() => usePulseOnChange(value));

			value = "b";
			rerender();

			expect(() => {
				unmount();
			}).not.toThrow();

			// Advance timers after unmount - should not cause errors
			act(() => {
				vi.advanceTimersByTime(600);
			});
		});
	});
});
