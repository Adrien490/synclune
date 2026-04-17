import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// matchMedia mock factory
// ---------------------------------------------------------------------------

function createMatchMediaMock(matches: boolean) {
	const listeners: Array<() => void> = [];
	const mql = {
		matches,
		addEventListener: vi.fn((event: string, cb: () => void) => {
			if (event === "change") listeners.push(cb);
		}),
		removeEventListener: vi.fn((event: string, cb: () => void) => {
			if (event === "change") {
				const idx = listeners.indexOf(cb);
				if (idx !== -1) listeners.splice(idx, 1);
			}
		}),
		_triggerChange: (newMatches?: boolean) => {
			if (typeof newMatches === "boolean") mql.matches = newMatches;
			for (const cb of listeners) cb();
		},
	};
	return mql;
}

let currentMql: ReturnType<typeof createMatchMediaMock>;
let matchMediaSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
	currentMql = createMatchMediaMock(false);
	matchMediaSpy = vi.fn(() => currentMql);
	vi.stubGlobal("matchMedia", matchMediaSpy);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Import under test (after stubs are set up)
// ---------------------------------------------------------------------------

import { useIsMobile, MOBILE_BREAKPOINT } from "../use-mobile";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useIsMobile", () => {
	describe("constants", () => {
		it("exports MOBILE_BREAKPOINT as 768", () => {
			expect(MOBILE_BREAKPOINT).toBe(768);
		});
	});

	describe("media query string", () => {
		it("subscribes to (max-width: 767px) — one below the breakpoint", () => {
			renderHook(() => useIsMobile());
			expect(matchMediaSpy).toHaveBeenCalledWith("(max-width: 767px)");
		});
	});

	describe("client snapshot", () => {
		it("returns true when matchMedia matches (mobile width)", () => {
			currentMql = createMatchMediaMock(true);
			matchMediaSpy.mockReturnValue(currentMql);

			const { result } = renderHook(() => useIsMobile());
			expect(result.current).toBe(true);
		});

		it("returns false when matchMedia does not match (desktop width)", () => {
			currentMql = createMatchMediaMock(false);
			matchMediaSpy.mockReturnValue(currentMql);

			const { result } = renderHook(() => useIsMobile());
			expect(result.current).toBe(false);
		});
	});

	describe("reactivity to media query changes", () => {
		it("updates when the media query fires a change event (desktop → mobile)", () => {
			currentMql = createMatchMediaMock(false);
			matchMediaSpy.mockReturnValue(currentMql);

			const { result } = renderHook(() => useIsMobile());
			expect(result.current).toBe(false);

			act(() => {
				currentMql._triggerChange(true);
			});

			expect(result.current).toBe(true);
		});

		it("updates when the media query fires a change event (mobile → desktop)", () => {
			currentMql = createMatchMediaMock(true);
			matchMediaSpy.mockReturnValue(currentMql);

			const { result } = renderHook(() => useIsMobile());
			expect(result.current).toBe(true);

			act(() => {
				currentMql._triggerChange(false);
			});

			expect(result.current).toBe(false);
		});
	});

	describe("lifecycle", () => {
		it("removes the change listener on unmount", () => {
			currentMql = createMatchMediaMock(false);
			matchMediaSpy.mockReturnValue(currentMql);

			const { unmount } = renderHook(() => useIsMobile());
			unmount();

			expect(currentMql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
		});

		it("re-subscribes across multiple consumer instances", () => {
			const { unmount: u1 } = renderHook(() => useIsMobile());
			const { unmount: u2 } = renderHook(() => useIsMobile());

			expect(currentMql.addEventListener).toHaveBeenCalledTimes(2);

			u1();
			u2();
			expect(currentMql.removeEventListener).toHaveBeenCalledTimes(2);
		});
	});
});
