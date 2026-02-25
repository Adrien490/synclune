import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// matchMedia mock factory
// ---------------------------------------------------------------------------

function createMatchMediaMock(matches: boolean) {
	const listeners: Array<() => void> = []
	const mql = {
		matches,
		addEventListener: vi.fn((event: string, cb: () => void) => {
			if (event === "change") listeners.push(cb)
		}),
		removeEventListener: vi.fn((event: string, cb: () => void) => {
			if (event === "change") {
				const idx = listeners.indexOf(cb)
				if (idx !== -1) listeners.splice(idx, 1)
			}
		}),
		_triggerChange: (newMatches: boolean) => {
			mql.matches = newMatches
			for (const cb of listeners) cb()
		},
	}
	return mql
}

let currentMql: ReturnType<typeof createMatchMediaMock>

beforeEach(() => {
	currentMql = createMatchMediaMock(false)
	vi.stubGlobal("matchMedia", vi.fn(() => currentMql))
})

afterEach(() => {
	vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Import under test (after stubs are set up)
// ---------------------------------------------------------------------------

import { useIsTouchDevice } from "../use-touch-device"

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useIsTouchDevice", () => {
	// -------------------------------------------------------------------------
	// SSR fallback
	// -------------------------------------------------------------------------

	describe("SSR fallback", () => {
		it("returns false as the server-side default (non-touch by default)", () => {
			// The getServerSnapshot always returns false.
			// We verify the initial state when matchMedia reports non-touch.
			currentMql = createMatchMediaMock(false)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { result } = renderHook(() => useIsTouchDevice())
			expect(result.current).toBe(false)
		})
	})

	// -------------------------------------------------------------------------
	// Client snapshot
	// -------------------------------------------------------------------------

	describe("client snapshot", () => {
		it("returns true for touch devices (hover: none and pointer: coarse)", () => {
			currentMql = createMatchMediaMock(true)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { result } = renderHook(() => useIsTouchDevice())
			expect(result.current).toBe(true)
		})

		it("returns false for non-touch devices (hover capable / fine pointer)", () => {
			currentMql = createMatchMediaMock(false)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { result } = renderHook(() => useIsTouchDevice())
			expect(result.current).toBe(false)
		})
	})

	// -------------------------------------------------------------------------
	// Reactivity
	// -------------------------------------------------------------------------

	describe("responds to media query change events", () => {
		it("updates to true when a touch device is detected after mount", () => {
			currentMql = createMatchMediaMock(false)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { result } = renderHook(() => useIsTouchDevice())
			expect(result.current).toBe(false)

			act(() => {
				currentMql._triggerChange(true)
			})

			expect(result.current).toBe(true)
		})

		it("removes the change listener on unmount", () => {
			currentMql = createMatchMediaMock(false)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { unmount } = renderHook(() => useIsTouchDevice())
			unmount()

			expect(currentMql.removeEventListener).toHaveBeenCalledWith(
				"change",
				expect.any(Function)
			)
		})
	})
})
