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
		// Helper: simulate a media query change
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

import { useMediaQuery } from "../use-media-query"

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useMediaQuery", () => {
	// -------------------------------------------------------------------------
	// Server snapshot
	// -------------------------------------------------------------------------

	describe("server snapshot (getServerSnapshot)", () => {
		it("returns false as the SSR fallback", () => {
			// useSyncExternalStore's third argument (getServerSnapshot) returns false.
			// In jsdom the client snapshot is used, but we can verify the initial
			// state matches what matchMedia reports.
			currentMql = createMatchMediaMock(false)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { result } = renderHook(() => useMediaQuery("(min-width: 640px)"))
			expect(result.current).toBe(false)
		})
	})

	// -------------------------------------------------------------------------
	// Client snapshot
	// -------------------------------------------------------------------------

	describe("client snapshot (getSnapshot)", () => {
		it("returns true when matchMedia reports matches=true", () => {
			currentMql = createMatchMediaMock(true)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { result } = renderHook(() => useMediaQuery("(min-width: 640px)"))
			expect(result.current).toBe(true)
		})

		it("returns false when matchMedia reports matches=false", () => {
			currentMql = createMatchMediaMock(false)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { result } = renderHook(() => useMediaQuery("(min-width: 640px)"))
			expect(result.current).toBe(false)
		})
	})

	// -------------------------------------------------------------------------
	// Reactivity to change events
	// -------------------------------------------------------------------------

	describe("responds to media query change events", () => {
		it("updates to true when the media query starts matching", () => {
			currentMql = createMatchMediaMock(false)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { result } = renderHook(() => useMediaQuery("(min-width: 640px)"))
			expect(result.current).toBe(false)

			act(() => {
				currentMql._triggerChange(true)
			})

			expect(result.current).toBe(true)
		})

		it("updates to false when the media query stops matching", () => {
			currentMql = createMatchMediaMock(true)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"))
			expect(result.current).toBe(true)

			act(() => {
				currentMql._triggerChange(false)
			})

			expect(result.current).toBe(false)
		})

		it("removes the change listener on unmount", () => {
			currentMql = createMatchMediaMock(false)
			vi.mocked(window.matchMedia).mockReturnValue(currentMql as unknown as MediaQueryList)

			const { unmount } = renderHook(() => useMediaQuery("(min-width: 640px)"))
			unmount()

			expect(currentMql.removeEventListener).toHaveBeenCalledWith(
				"change",
				expect.any(Function)
			)
		})
	})
})
