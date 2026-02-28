import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockPush } = vi.hoisted(() => ({
	mockPush: vi.fn(),
}));

const mockSearchParamsEntries = vi.hoisted<{ entries: Array<[string, string]> }>(() => ({
	entries: [],
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => buildSearchParams(mockSearchParamsEntries.entries),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSearchParams(entries: Array<[string, string]>) {
	const params = new URLSearchParams();
	for (const [key, value] of entries) {
		params.append(key, value);
	}
	return params;
}

// ---------------------------------------------------------------------------
// Import under test (after mocks are set up)
// ---------------------------------------------------------------------------

import { useSortSelect } from "../use-sort-select";

// ---------------------------------------------------------------------------
// Helpers for tests
// ---------------------------------------------------------------------------

function setupParams(entries: Array<[string, string]>) {
	mockSearchParamsEntries.entries = entries;
}

function clearParams() {
	mockSearchParamsEntries.entries = [];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSortSelect", () => {
	beforeEach(() => {
		clearParams();
		mockPush.mockClear();
	});

	// -------------------------------------------------------------------------
	// Return value shape
	// -------------------------------------------------------------------------

	describe("return value", () => {
		it("returns value, setSort, clearSort, and isPending", () => {
			const { result } = renderHook(() => useSortSelect());
			expect(typeof result.current.value).toBe("string");
			expect(typeof result.current.setSort).toBe("function");
			expect(typeof result.current.clearSort).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});
	});

	// -------------------------------------------------------------------------
	// Initial value from URL
	// -------------------------------------------------------------------------

	describe("initial value", () => {
		it("returns an empty string when sortBy is not in the URL", () => {
			setupParams([]);
			const { result } = renderHook(() => useSortSelect());
			expect(result.current.value).toBe("");
		});

		it("returns the sortBy value from the URL params", () => {
			setupParams([["sortBy", "price-asc"]]);
			const { result } = renderHook(() => useSortSelect());
			expect(result.current.value).toBe("price-asc");
		});
	});

	// -------------------------------------------------------------------------
	// setSort
	// -------------------------------------------------------------------------

	describe("setSort", () => {
		it("calls router.push with sortBy param set", () => {
			setupParams([]);
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.setSort("price-desc");
			});

			expect(mockPush).toHaveBeenCalledTimes(1);
			const url: string = mockPush.mock.calls[0]![0];
			expect(url).toContain("sortBy=price-desc");
		});

		it("resets page to 1 when setting a sort value", () => {
			setupParams([["page", "3"]]);
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.setSort("price-asc");
			});

			const url: string = mockPush.mock.calls[0]![0];
			expect(url).toContain("page=1");
			expect(url).not.toContain("page=3");
		});

		it("replaces the existing sortBy value", () => {
			setupParams([["sortBy", "price-asc"]]);
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.setSort("price-desc");
			});

			const url: string = mockPush.mock.calls[0]![0];
			expect(url).toContain("sortBy=price-desc");
			expect(url).not.toContain("sortBy=price-asc");
		});

		it("does not add sortBy to the URL when value is empty string", () => {
			setupParams([]);
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.setSort("");
			});

			const url: string = mockPush.mock.calls[0]![0];
			expect(url).not.toContain("sortBy");
		});

		it("passes scroll: false option to router.push", () => {
			setupParams([]);
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.setSort("name-asc");
			});

			expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
		});
	});

	// -------------------------------------------------------------------------
	// clearSort
	// -------------------------------------------------------------------------

	describe("clearSort", () => {
		it("removes sortBy from the URL", () => {
			setupParams([["sortBy", "price-asc"]]);
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.clearSort();
			});

			expect(mockPush).toHaveBeenCalledTimes(1);
			const url: string = mockPush.mock.calls[0]![0];
			expect(url).not.toContain("sortBy");
		});

		it("resets page to 1 when clearing sort", () => {
			setupParams([
				["sortBy", "price-asc"],
				["page", "5"],
			]);
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.clearSort();
			});

			const url: string = mockPush.mock.calls[0]![0];
			expect(url).toContain("page=1");
		});

		it("preserves other params when clearing sort", () => {
			setupParams([
				["sortBy", "price-asc"],
				["search", "bague"],
			]);
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.clearSort();
			});

			const url: string = mockPush.mock.calls[0]![0];
			expect(url).toContain("search=bague");
			expect(url).not.toContain("sortBy");
		});
	});
});
