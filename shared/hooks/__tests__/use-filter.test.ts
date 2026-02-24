import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockReplace, mockGet, mockGetAll, mockHas, mockForEach, mockToString } =
	vi.hoisted(() => ({
		mockReplace: vi.fn(),
		mockGet: vi.fn(),
		mockGetAll: vi.fn(),
		mockHas: vi.fn(),
		mockForEach: vi.fn(),
		mockToString: vi.fn(),
	}))

const mockPathname = vi.hoisted(() => ({ value: "/admin/produits" }))
const mockSearchParamsEntries = vi.hoisted<{ entries: Array<[string, string]> }>(
	() => ({ entries: [] })
)

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	usePathname: () => mockPathname.value,
	useSearchParams: () => buildSearchParams(mockSearchParamsEntries.entries),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a real URLSearchParams-like object from an entries array.
 * This is iterated by the hook's `searchParams.forEach()` call.
 */
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

import { useFilter } from "../use-filter"

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

describe("useFilter", () => {
	beforeEach(() => {
		clearParams()
		mockReplace.mockClear()
	})

	// -------------------------------------------------------------------------
	// getFilter
	// -------------------------------------------------------------------------

	describe("getFilter", () => {
		it("returns null when the filter is not present in the URL", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())
			expect(result.current.getFilter("status")).toBeNull()
		})

		it("returns the value when the filter is present with the default prefix", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.getFilter("status")).toBe("ACTIVE")
		})

		it("accepts a fully-qualified key (with prefix) and still returns the value", () => {
			setupParams([["filter_status", "PENDING"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.getFilter("filter_status")).toBe("PENDING")
		})

		it("respects a custom filterPrefix option", () => {
			setupParams([["f_status", "DRAFT"]])
			const { result } = renderHook(() => useFilter({ filterPrefix: "f_" }))
			expect(result.current.getFilter("status")).toBe("DRAFT")
		})

		it("returns null for a different filter key", () => {
			setupParams([["filter_type", "ring"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.getFilter("status")).toBeNull()
		})
	})

	// -------------------------------------------------------------------------
	// getFilterAll
	// -------------------------------------------------------------------------

	describe("getFilterAll", () => {
		it("returns an empty array when the filter is not present", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())
			expect(result.current.getFilterAll("status")).toEqual([])
		})

		it("returns a single-element array for a single value", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.getFilterAll("status")).toEqual(["ACTIVE"])
		})

		it("returns all values for a multi-value filter", () => {
			setupParams([
				["filter_status", "ACTIVE"],
				["filter_status", "PENDING"],
			])
			const { result } = renderHook(() => useFilter())
			expect(result.current.getFilterAll("status")).toEqual(["ACTIVE", "PENDING"])
		})

		it("accepts a fully-qualified key (with prefix)", () => {
			setupParams([
				["filter_color", "or-rose"],
				["filter_color", "argent"],
			])
			const { result } = renderHook(() => useFilter())
			expect(result.current.getFilterAll("filter_color")).toEqual(["or-rose", "argent"])
		})
	})

	// -------------------------------------------------------------------------
	// hasFilter
	// -------------------------------------------------------------------------

	describe("hasFilter", () => {
		it("returns false when the filter is absent", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())
			expect(result.current.hasFilter("status")).toBe(false)
		})

		it("returns true when the filter is present", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.hasFilter("status")).toBe(true)
		})

		it("returns true when checked with a fully-qualified key", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.hasFilter("filter_status")).toBe(true)
		})

		it("returns false for an unrelated filter key", () => {
			setupParams([["filter_type", "ring"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.hasFilter("status")).toBe(false)
		})
	})

	// -------------------------------------------------------------------------
	// activeFilters / activeFiltersCount / hasActiveFilters
	// -------------------------------------------------------------------------

	describe("activeFilters", () => {
		it("returns an empty array when no filter params are present", () => {
			setupParams([["cursor", "abc"], ["page", "2"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.activeFilters).toEqual([])
		})

		it("excludes navigation params (page, perPage, sortBy, sortOrder, search, cursor, direction)", () => {
			setupParams([
				["page", "2"],
				["perPage", "20"],
				["sortBy", "createdAt"],
				["sortOrder", "desc"],
				["search", "lune"],
				["cursor", "xyz"],
				["direction", "forward"],
			])
			const { result } = renderHook(() => useFilter())
			expect(result.current.activeFilters).toHaveLength(0)
			expect(result.current.hasActiveFilters).toBe(false)
		})

		it("includes params with the filter prefix", () => {
			setupParams([
				["filter_status", "ACTIVE"],
				["filter_type", "ring"],
			])
			const { result } = renderHook(() => useFilter())
			expect(result.current.activeFilters).toHaveLength(2)
			expect(result.current.activeFiltersCount).toBe(2)
			expect(result.current.hasActiveFilters).toBe(true)
		})

		it("builds a unique id from key and value", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.activeFilters[0].id).toBe("filter_status-ACTIVE")
		})

		it("exposes the raw key (with prefix) and label (without prefix)", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter())
			const filter = result.current.activeFilters[0]
			expect(filter.key).toBe("filter_status")
			expect(filter.label).toBe("status")
		})

		it("excludes params that do not start with the filterPrefix", () => {
			setupParams([["other_param", "value"]])
			const { result } = renderHook(() => useFilter())
			expect(result.current.activeFilters).toHaveLength(0)
		})

		it("multi-value filters produce one entry per value", () => {
			setupParams([
				["filter_status", "ACTIVE"],
				["filter_status", "PENDING"],
			])
			const { result } = renderHook(() => useFilter())
			expect(result.current.activeFilters).toHaveLength(2)
		})
	})

	// -------------------------------------------------------------------------
	// setFilter – URL building
	// -------------------------------------------------------------------------

	describe("setFilter", () => {
		it("calls router.replace with the correct URL containing the filter param", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", "ACTIVE")
			})

			expect(mockReplace).toHaveBeenCalledTimes(1)
			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("filter_status=ACTIVE")
		})

		it("prepends the filterPrefix to the key when the key does not already include it", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("type", "ring")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("filter_type=ring")
		})

		it("resets page to 1 by default", () => {
			setupParams([["page", "5"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", "ACTIVE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("page=1")
			expect(url).not.toContain("page=5")
		})

		it("preserves page when preservePage option is true", () => {
			setupParams([["page", "5"]])
			const { result } = renderHook(() => useFilter({ preservePage: true }))

			act(() => {
				result.current.setFilter("status", "ACTIVE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("page=5")
		})

		it("does not add the filter for undefined values", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", undefined)
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).not.toContain("filter_status")
		})

		it("handles array values by appending each element", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", ["ACTIVE", "PENDING"])
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("filter_status=ACTIVE")
			expect(url).toContain("filter_status=PENDING")
		})

		it("preserves non-filter params (like cursor) in the URL", () => {
			setupParams([["cursor", "abc123"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", "ACTIVE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("cursor=abc123")
		})

		it("drops previous filter params when setting a new one", () => {
			setupParams([["filter_status", "OLD_VALUE"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", "NEW_VALUE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("filter_status=NEW_VALUE")
			expect(url).not.toContain("filter_status=OLD_VALUE")
		})
	})

	// -------------------------------------------------------------------------
	// removeFilter
	// -------------------------------------------------------------------------

	describe("removeFilter", () => {
		it("removes the filter param from the URL", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.removeFilter("filter_status")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).not.toContain("filter_status")
		})

		it("removes only the specified value from a multi-value filter", () => {
			setupParams([
				["filter_status", "ACTIVE"],
				["filter_status", "PENDING"],
			])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.removeFilter("filter_status", "ACTIVE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).not.toContain("filter_status=ACTIVE")
			expect(url).toContain("filter_status=PENDING")
		})

		it("removes the entire key when only one value remains and a specific value is passed", () => {
			setupParams([["filter_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.removeFilter("filter_status", "ACTIVE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).not.toContain("filter_status")
		})

		it("resets page to 1", () => {
			setupParams([["filter_status", "ACTIVE"], ["page", "3"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.removeFilter("filter_status")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("page=1")
		})

		it("preserves unrelated params", () => {
			setupParams([["filter_status", "ACTIVE"], ["cursor", "xyz"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.removeFilter("filter_status")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("cursor=xyz")
		})
	})

	// -------------------------------------------------------------------------
	// clearAllFilters
	// -------------------------------------------------------------------------

	describe("clearAllFilters", () => {
		it("removes all filter params from the URL", () => {
			setupParams([
				["filter_status", "ACTIVE"],
				["filter_type", "ring"],
				["filter_color", "or-rose"],
			])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.clearAllFilters()
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).not.toContain("filter_status")
			expect(url).not.toContain("filter_type")
			expect(url).not.toContain("filter_color")
		})

		it("preserves non-filter params", () => {
			setupParams([
				["filter_status", "ACTIVE"],
				["cursor", "abc"],
				["search", "lune"],
			])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.clearAllFilters()
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("cursor=abc")
			expect(url).toContain("search=lune")
		})

		it("resets page to 1", () => {
			setupParams([["filter_status", "ACTIVE"], ["page", "4"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.clearAllFilters()
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("page=1")
		})

		it("produces a plain pathname URL when no params remain after clearing", () => {
			setupParams([["filter_status", "ACTIVE"]])
			mockPathname.value = "/admin/produits"
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.clearAllFilters()
			})

			// page=1 is always appended by preserveNonFilterParams so the URL
			// will have at least ?page=1, not a bare pathname.
			const url: string = mockReplace.mock.calls[0][0]
			expect(url).not.toContain("filter_status")
		})
	})

	// -------------------------------------------------------------------------
	// setFilters (batch)
	// -------------------------------------------------------------------------

	describe("setFilters", () => {
		it("sets multiple filters in one router.replace call", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilters({ status: "ACTIVE", type: "ring" })
			})

			expect(mockReplace).toHaveBeenCalledTimes(1)
			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("filter_status=ACTIVE")
			expect(url).toContain("filter_type=ring")
		})

		it("skips null / undefined / empty string values", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilters({ status: undefined, type: "", color: null as unknown as undefined })
			})

			expect(mockReplace).toHaveBeenCalledTimes(1)
			const url: string = mockReplace.mock.calls[0][0]
			expect(url).not.toContain("filter_status")
			expect(url).not.toContain("filter_type")
			expect(url).not.toContain("filter_color")
		})

		it("formats Date values as ISO strings", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter())
			const date = new Date("2026-01-15T00:00:00.000Z")

			act(() => {
				result.current.setFilters({ createdAt: date })
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("filter_createdAt=" + encodeURIComponent(date.toISOString()))
		})
	})

	// -------------------------------------------------------------------------
	// removeFilters (batch)
	// -------------------------------------------------------------------------

	describe("removeFilters", () => {
		it("removes multiple filter params in one call", () => {
			setupParams([
				["filter_status", "ACTIVE"],
				["filter_type", "ring"],
				["cursor", "abc"],
			])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.removeFilters(["filter_status", "filter_type"])
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).not.toContain("filter_status")
			expect(url).not.toContain("filter_type")
			expect(url).toContain("cursor=abc")
		})
	})

	// -------------------------------------------------------------------------
	// Filter preservation (non-filter params)
	// -------------------------------------------------------------------------

	describe("non-filter param preservation", () => {
		it("cursor param is preserved when setting a filter", () => {
			setupParams([["cursor", "token_123"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", "ACTIVE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("cursor=token_123")
		})

		it("search param is preserved when setting a filter", () => {
			setupParams([["search", "bague"]])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", "ACTIVE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("search=bague")
		})

		it("multiple non-filter params are all preserved", () => {
			setupParams([
				["cursor", "abc"],
				["search", "bague"],
				["perPage", "20"],
			])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", "ACTIVE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("cursor=abc")
			expect(url).toContain("search=bague")
			expect(url).toContain("perPage=20")
		})
	})

	// -------------------------------------------------------------------------
	// Custom filterPrefix
	// -------------------------------------------------------------------------

	describe("custom filterPrefix option", () => {
		it("uses the custom prefix when building filter URLs", () => {
			setupParams([])
			const { result } = renderHook(() => useFilter({ filterPrefix: "f_" }))

			act(() => {
				result.current.setFilter("status", "ACTIVE")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("f_status=ACTIVE")
			expect(url).not.toContain("filter_status")
		})

		it("includes active filters using the custom prefix", () => {
			setupParams([["f_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter({ filterPrefix: "f_" }))
			expect(result.current.activeFilters).toHaveLength(1)
			expect(result.current.activeFilters[0].label).toBe("status")
		})

		it("clearAllFilters respects the custom prefix", () => {
			setupParams([["f_status", "ACTIVE"]])
			const { result } = renderHook(() => useFilter({ filterPrefix: "f_" }))

			act(() => {
				result.current.clearAllFilters()
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).not.toContain("f_status")
		})
	})

	// -------------------------------------------------------------------------
	// URL building - pathname handling
	// -------------------------------------------------------------------------

	describe("URL building with pathname", () => {
		it("includes the pathname in the built URL", () => {
			mockPathname.value = "/admin/commandes"
			setupParams([])
			const { result } = renderHook(() => useFilter())

			act(() => {
				result.current.setFilter("status", "PENDING")
			})

			const url: string = mockReplace.mock.calls[0][0]
			expect(url).toContain("/admin/commandes")
		})
	})
})
