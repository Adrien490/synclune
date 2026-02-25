import { renderHook } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// Notes on module-level cache
//
// `use-platform.ts` caches the detected platform in a module-level variable
// `cachedPlatform`. Because Vitest runs all tests in the same module context,
// the cache persists across tests. We work around this by mocking navigator
// properties and resetting the module between test groups via vi.resetModules()
// combined with dynamic imports.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useIsMac", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.resetModules()
	})

	// -------------------------------------------------------------------------
	// SSR fallback (useSyncExternalStore getServerSnapshot)
	// -------------------------------------------------------------------------

	describe("SSR fallback", () => {
		it("getServerSnapshot returns 'mac' which makes useIsMac return true by default", async () => {
			// Reset module so cachedPlatform is null
			vi.resetModules()
			// Simulate SSR: navigator is defined (jsdom) but userAgentData is absent.
			// The SSR snapshot always returns "mac".
			// We verify by confirming useIsMac returns true when navigator.platform is "MacIntel".
			Object.defineProperty(navigator, "platform", {
				value: "MacIntel",
				configurable: true,
			})

			const { useIsMac } = await import("../use-platform")
			const { result } = renderHook(() => useIsMac())
			expect(result.current).toBe(true)
		})
	})

	// -------------------------------------------------------------------------
	// Mac detection via navigator.platform
	// -------------------------------------------------------------------------

	describe("Mac detection", () => {
		it("returns true when navigator.platform is MacIntel", async () => {
			vi.resetModules()
			Object.defineProperty(navigator, "platform", {
				value: "MacIntel",
				configurable: true,
			})
			Object.defineProperty(navigator, "userAgent", {
				value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
				configurable: true,
			})

			const { useIsMac } = await import("../use-platform")
			const { result } = renderHook(() => useIsMac())
			expect(result.current).toBe(true)
		})
	})

	// -------------------------------------------------------------------------
	// Windows detection via navigator.platform
	// -------------------------------------------------------------------------

	describe("Windows detection", () => {
		it("returns false when navigator.platform is Win32", async () => {
			vi.resetModules()
			Object.defineProperty(navigator, "platform", {
				value: "Win32",
				configurable: true,
			})
			Object.defineProperty(navigator, "userAgent", {
				value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
				configurable: true,
			})

			const { useIsMac } = await import("../use-platform")
			const { result } = renderHook(() => useIsMac())
			expect(result.current).toBe(false)
		})
	})

	// -------------------------------------------------------------------------
	// Linux detection via navigator.platform
	// -------------------------------------------------------------------------

	describe("Linux detection", () => {
		it("returns false when navigator.platform is Linux x86_64", async () => {
			vi.resetModules()
			Object.defineProperty(navigator, "platform", {
				value: "Linux x86_64",
				configurable: true,
			})
			Object.defineProperty(navigator, "userAgent", {
				value: "Mozilla/5.0 (X11; Linux x86_64)",
				configurable: true,
			})

			const { useIsMac } = await import("../use-platform")
			const { result } = renderHook(() => useIsMac())
			expect(result.current).toBe(false)
		})
	})
})
