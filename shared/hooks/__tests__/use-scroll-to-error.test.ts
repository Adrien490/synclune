import { renderHook } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// Setup: mock requestAnimationFrame to call the callback synchronously
// ---------------------------------------------------------------------------

beforeEach(() => {
	vi.stubGlobal(
		"requestAnimationFrame",
		(callback: FrameRequestCallback) => {
			callback(0)
			return 0
		}
	)
})

afterEach(() => {
	vi.unstubAllGlobals()
	document.body.innerHTML = ""
})

// ---------------------------------------------------------------------------
// Import under test (after stubs are set up)
// ---------------------------------------------------------------------------

import { useScrollToError } from "../use-scroll-to-error"

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useScrollToError", () => {
	// -------------------------------------------------------------------------
	// Return value
	// -------------------------------------------------------------------------

	describe("return value", () => {
		it("returns an object with scrollToFirstError function", () => {
			const { result } = renderHook(() => useScrollToError())
			expect(typeof result.current.scrollToFirstError).toBe("function")
		})
	})

	// -------------------------------------------------------------------------
	// scrollToFirstError behavior
	// -------------------------------------------------------------------------

	describe("scrollToFirstError", () => {
		it("does nothing when no error field is in the document", () => {
			const { result } = renderHook(() => useScrollToError())

			expect(() => {
				result.current.scrollToFirstError()
			}).not.toThrow()
		})

		it("calls scrollIntoView on the first field with data-error='true'", () => {
			const errorEl = document.createElement("input")
			errorEl.setAttribute("data-error", "true")
			const scrollIntoViewMock = vi.fn()
			errorEl.scrollIntoView = scrollIntoViewMock
			errorEl.focus = vi.fn()
			document.body.appendChild(errorEl)

			const { result } = renderHook(() => useScrollToError())
			result.current.scrollToFirstError()

			expect(scrollIntoViewMock).toHaveBeenCalledWith({
				behavior: "smooth",
				block: "center",
			})
		})

		it("calls scrollIntoView on the first field with aria-invalid='true'", () => {
			const errorEl = document.createElement("input")
			errorEl.setAttribute("aria-invalid", "true")
			const scrollIntoViewMock = vi.fn()
			errorEl.scrollIntoView = scrollIntoViewMock
			errorEl.focus = vi.fn()
			document.body.appendChild(errorEl)

			const { result } = renderHook(() => useScrollToError())
			result.current.scrollToFirstError()

			expect(scrollIntoViewMock).toHaveBeenCalledTimes(1)
		})

		it("calls focus on the first error field", () => {
			const errorEl = document.createElement("input")
			errorEl.setAttribute("data-error", "true")
			errorEl.scrollIntoView = vi.fn()
			const focusMock = vi.fn()
			errorEl.focus = focusMock
			document.body.appendChild(errorEl)

			const { result } = renderHook(() => useScrollToError())
			result.current.scrollToFirstError()

			expect(focusMock).toHaveBeenCalledTimes(1)
		})

		it("targets the first error field when multiple are present", () => {
			const firstError = document.createElement("input")
			firstError.setAttribute("data-error", "true")
			const firstScrollMock = vi.fn()
			firstError.scrollIntoView = firstScrollMock
			firstError.focus = vi.fn()

			const secondError = document.createElement("input")
			secondError.setAttribute("aria-invalid", "true")
			const secondScrollMock = vi.fn()
			secondError.scrollIntoView = secondScrollMock
			secondError.focus = vi.fn()

			document.body.appendChild(firstError)
			document.body.appendChild(secondError)

			const { result } = renderHook(() => useScrollToError())
			result.current.scrollToFirstError()

			expect(firstScrollMock).toHaveBeenCalledTimes(1)
			expect(secondScrollMock).not.toHaveBeenCalled()
		})
	})
})
