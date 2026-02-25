import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockPush } = vi.hoisted(() => ({
	mockPush: vi.fn(),
}))

const mockSearchParamsEntries = vi.hoisted<{ entries: Array<[string, string]> }>(
	() => ({ entries: [] })
)

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => buildSearchParams(mockSearchParamsEntries.entries),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSearchParams(entries: Array<[string, string]>) {
	const params = new URLSearchParams()
	for (const [key, value] of entries) {
		params.append(key, value)
	}
	return params
}

// ---------------------------------------------------------------------------
// Import under test (after mocks are set up)
// ---------------------------------------------------------------------------

import { useSelectFilter } from "../use-select-filter"

// ---------------------------------------------------------------------------
// Helpers for tests
// ---------------------------------------------------------------------------

function setupParams(entries: Array<[string, string]>) {
	mockSearchParamsEntries.entries = entries
}

function clearParams() {
	mockSearchParamsEntries.entries = []
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSelectFilter", () => {
	beforeEach(() => {
		clearParams()
		mockPush.mockClear()
	})

	// -------------------------------------------------------------------------
	// Return value shape
	// -------------------------------------------------------------------------

	describe("return value", () => {
		it("returns value, setFilter, clearFilter, and isPending", () => {
			const { result } = renderHook(() => useSelectFilter("status"))
			expect(typeof result.current.value).toBe("string")
			expect(typeof result.current.setFilter).toBe("function")
			expect(typeof result.current.clearFilter).toBe("function")
			expect(typeof result.current.isPending).toBe("boolean")
		})
	})

	// -------------------------------------------------------------------------
	// Initial value from URL
	// -------------------------------------------------------------------------

	describe("initial value", () => {
		it("returns an empty string when the filter is not in the URL", () => {
			setupParams([])
			const { result } = renderHook(() => useSelectFilter("status"))
			expect(result.current.value).toBe("")
		})

		it("returns the filter value from the URL using the default filter_ prefix", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useSelectFilter("status"))
			expect(result.current.value).toBe("ACTIVE")
		})

		it("returns the filter value when noPrefix=true and the raw key is used", () => {
			setupParams([["status", "PENDING"]])
			const { result } = renderHook(() => useSelectFilter("status", { noPrefix: true }))
			expect(result.current.value).toBe("PENDING")
		})
	})

	// -------------------------------------------------------------------------
	// setFilter
	// -------------------------------------------------------------------------

	describe("setFilter", () => {
		it("calls router.push with the filter param using the default filter_ prefix", () => {
			setupParams([])
			const { result } = renderHook(() => useSelectFilter("status"))

			act(() => {
				result.current.setFilter("ACTIVE")
			})

			expect(mockPush).toHaveBeenCalledTimes(1)
			const url: string = mockPush.mock.calls[0][0]
			expect(url).toContain("filter_status=ACTIVE")
		})

		it("uses the raw key without prefix when noPrefix=true", () => {
			setupParams([])
			const { result } = renderHook(() => useSelectFilter("category", { noPrefix: true }))

			act(() => {
				result.current.setFilter("rings")
			})

			const url: string = mockPush.mock.calls[0][0]
			expect(url).toContain("category=rings")
			expect(url).not.toContain("filter_category")
		})

		it("resets page to 1 when setting a filter", () => {
			setupParams([["page", "4"]])
			const { result } = renderHook(() => useSelectFilter("status"))

			act(() => {
				result.current.setFilter("PENDING")
			})

			const url: string = mockPush.mock.calls[0][0]
			expect(url).toContain("page=1")
			expect(url).not.toContain("page=4")
		})

		it("replaces the existing filter value", () => {
			setupParams([["filter_status", "OLD"]])
			const { result } = renderHook(() => useSelectFilter("status"))

			act(() => {
				result.current.setFilter("NEW")
			})

			const url: string = mockPush.mock.calls[0][0]
			expect(url).toContain("filter_status=NEW")
			expect(url).not.toContain("filter_status=OLD")
		})

		it("does not add the param when value is empty string", () => {
			setupParams([])
			const { result } = renderHook(() => useSelectFilter("status"))

			act(() => {
				result.current.setFilter("")
			})

			const url: string = mockPush.mock.calls[0][0]
			expect(url).not.toContain("filter_status")
		})

		it("passes scroll: false option to router.push", () => {
			setupParams([])
			const { result } = renderHook(() => useSelectFilter("status"))

			act(() => {
				result.current.setFilter("ACTIVE")
			})

			expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false })
		})
	})

	// -------------------------------------------------------------------------
	// clearFilter
	// -------------------------------------------------------------------------

	describe("clearFilter", () => {
		it("removes the filter param from the URL", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useSelectFilter("status"))

			act(() => {
				result.current.clearFilter()
			})

			expect(mockPush).toHaveBeenCalledTimes(1)
			const url: string = mockPush.mock.calls[0][0]
			expect(url).not.toContain("filter_status")
		})

		it("resets page to 1 when clearing the filter", () => {
			setupParams([["filter_status", "ACTIVE"], ["page", "3"]])
			const { result } = renderHook(() => useSelectFilter("status"))

			act(() => {
				result.current.clearFilter()
			})

			const url: string = mockPush.mock.calls[0][0]
			expect(url).toContain("page=1")
		})

		it("preserves other params when clearing the filter", () => {
			setupParams([["filter_status", "ACTIVE"], ["search", "collier"]])
			const { result } = renderHook(() => useSelectFilter("status"))

			act(() => {
				result.current.clearFilter()
			})

			const url: string = mockPush.mock.calls[0][0]
			expect(url).toContain("search=collier")
			expect(url).not.toContain("filter_status")
		})
	})
})
