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

function setupParams(entries: Array<[string, string]>) {
	mockSearchParamsEntries.entries = entries;
}

function clearParams() {
	mockSearchParamsEntries.entries = [];
}

/**
 * Extracts the list of selected IDs from a router.push URL call.
 * The hook calls router.push(`?${params.toString()}`, ...).
 */
function getSelectionFromPush(callIndex = 0): string[] {
	const url: string = mockPush.mock.calls[callIndex]![0];
	const params = new URLSearchParams(url.replace(/^\?/, ""));
	return params.getAll("selected");
}

// ---------------------------------------------------------------------------
// Import under test (after mocks are set up)
// ---------------------------------------------------------------------------

import { useSelection } from "../use-selection";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSelection", () => {
	beforeEach(() => {
		clearParams();
		mockPush.mockClear();
	});

	// -------------------------------------------------------------------------
	// Initial state
	// -------------------------------------------------------------------------

	describe("initial state", () => {
		it("has no selected items when URL params are empty", () => {
			setupParams([]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.selectedItems).toEqual([]);
		});

		it("reads initial selection from URL params", () => {
			setupParams([
				["selected", "item-1"],
				["selected", "item-2"],
			]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.selectedItems).toEqual(["item-1", "item-2"]);
		});

		it("supports a custom selectionKey", () => {
			setupParams([
				["ids", "abc"],
				["ids", "def"],
			]);
			const { result } = renderHook(() => useSelection("ids"));
			expect(result.current.selectedItems).toEqual(["abc", "def"]);
		});
	});

	// -------------------------------------------------------------------------
	// isSelected
	// -------------------------------------------------------------------------

	describe("isSelected", () => {
		it("returns false when item is not in selection", () => {
			setupParams([]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.isSelected("item-1")).toBe(false);
		});

		it("returns true when item is in selection", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.isSelected("item-1")).toBe(true);
		});

		it("returns false for a different item not in selection", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.isSelected("item-2")).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// areAllSelected
	// -------------------------------------------------------------------------

	describe("areAllSelected", () => {
		it("returns false for an empty items array", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.areAllSelected([])).toBe(false);
		});

		it("returns false when no items are selected", () => {
			setupParams([]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.areAllSelected(["item-1", "item-2"])).toBe(false);
		});

		it("returns false when only some items are selected", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.areAllSelected(["item-1", "item-2"])).toBe(false);
		});

		it("returns true when all items in the list are selected", () => {
			setupParams([
				["selected", "item-1"],
				["selected", "item-2"],
			]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.areAllSelected(["item-1", "item-2"])).toBe(true);
		});

		it("returns true even when there are extra selected items beyond the list", () => {
			setupParams([
				["selected", "item-1"],
				["selected", "item-2"],
				["selected", "item-3"],
			]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.areAllSelected(["item-1", "item-2"])).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// areSomeSelected
	// -------------------------------------------------------------------------

	describe("areSomeSelected", () => {
		it("returns false for an empty items array", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.areSomeSelected([])).toBe(false);
		});

		it("returns false when none of the items are selected", () => {
			setupParams([]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.areSomeSelected(["item-1", "item-2"])).toBe(false);
		});

		it("returns true when only some items are selected", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.areSomeSelected(["item-1", "item-2"])).toBe(true);
		});

		it("returns false when ALL items are selected (not partial)", () => {
			setupParams([
				["selected", "item-1"],
				["selected", "item-2"],
			]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.areSomeSelected(["item-1", "item-2"])).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// getSelectedCount
	// -------------------------------------------------------------------------

	describe("getSelectedCount", () => {
		it("returns 0 when nothing is selected", () => {
			setupParams([]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.getSelectedCount()).toBe(0);
		});

		it("returns the correct count of selected items", () => {
			setupParams([
				["selected", "item-1"],
				["selected", "item-2"],
				["selected", "item-3"],
			]);
			const { result } = renderHook(() => useSelection());
			expect(result.current.getSelectedCount()).toBe(3);
		});
	});

	// -------------------------------------------------------------------------
	// handleSelectionChange (select/deselect all)
	// -------------------------------------------------------------------------

	describe("handleSelectionChange", () => {
		it("selects all provided items when checked=true", () => {
			setupParams([]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleSelectionChange(["item-1", "item-2"], true);
			});

			expect(mockPush).toHaveBeenCalledTimes(1);
			const selected = getSelectionFromPush();
			expect(selected).toContain("item-1");
			expect(selected).toContain("item-2");
		});

		it("deduplicates when new items overlap with already-selected items", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleSelectionChange(["item-1", "item-2"], true);
			});

			const selected = getSelectionFromPush();
			const uniqueSelected = [...new Set(selected)];
			expect(uniqueSelected).toHaveLength(selected.length);
			expect(selected.filter((id) => id === "item-1")).toHaveLength(1);
		});

		it("deselects all provided items when checked=false", () => {
			setupParams([
				["selected", "item-1"],
				["selected", "item-2"],
				["selected", "item-3"],
			]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleSelectionChange(["item-1", "item-2"], false);
			});

			const selected = getSelectionFromPush();
			expect(selected).not.toContain("item-1");
			expect(selected).not.toContain("item-2");
			expect(selected).toContain("item-3");
		});

		it("preserves items selected on other pages when deselecting current page", () => {
			setupParams([
				["selected", "page1-item"],
				["selected", "page2-item"],
			]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				// Only deselect page1-item (current page)
				result.current.handleSelectionChange(["page1-item"], false);
			});

			const selected = getSelectionFromPush();
			expect(selected).not.toContain("page1-item");
			expect(selected).toContain("page2-item");
		});
	});

	// -------------------------------------------------------------------------
	// handleItemSelectionChange (single item)
	// -------------------------------------------------------------------------

	describe("handleItemSelectionChange", () => {
		it("adds the item to selection when checked=true", () => {
			setupParams([]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleItemSelectionChange("item-1", true);
			});

			const selected = getSelectionFromPush();
			expect(selected).toContain("item-1");
		});

		it("removes the item from selection when checked=false", () => {
			setupParams([
				["selected", "item-1"],
				["selected", "item-2"],
			]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleItemSelectionChange("item-1", false);
			});

			const selected = getSelectionFromPush();
			expect(selected).not.toContain("item-1");
			expect(selected).toContain("item-2");
		});

		it("preserves other selected items when adding a new one", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleItemSelectionChange("item-2", true);
			});

			const selected = getSelectionFromPush();
			expect(selected).toContain("item-1");
			expect(selected).toContain("item-2");
		});

		it("makes no change to the URL when removing an item not in selection", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleItemSelectionChange("item-99", false);
			});

			const selected = getSelectionFromPush();
			expect(selected).toContain("item-1");
			expect(selected).not.toContain("item-99");
		});
	});

	// -------------------------------------------------------------------------
	// clearAll
	// -------------------------------------------------------------------------

	describe("clearAll", () => {
		it("removes all selected items", () => {
			setupParams([
				["selected", "item-1"],
				["selected", "item-2"],
			]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.clearAll();
			});

			const selected = getSelectionFromPush();
			expect(selected).toHaveLength(0);
		});

		it("preserves non-selection params", () => {
			setupParams([
				["selected", "item-1"],
				["page", "2"],
				["search", "lune"],
			]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.clearAll();
			});

			const url: string = mockPush.mock.calls[0]![0];
			const params = new URLSearchParams(url.replace(/^\?/, ""));
			expect(params.get("page")).toBe("2");
			expect(params.get("search")).toBe("lune");
		});

		it("calls router.push once", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.clearAll();
			});

			expect(mockPush).toHaveBeenCalledTimes(1);
		});
	});

	// -------------------------------------------------------------------------
	// clearItems (partial deselection)
	// -------------------------------------------------------------------------

	describe("clearItems", () => {
		it("removes only the specified items from selection", () => {
			setupParams([
				["selected", "item-1"],
				["selected", "item-2"],
				["selected", "item-3"],
			]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.clearItems(["item-1", "item-3"]);
			});

			const selected = getSelectionFromPush();
			expect(selected).not.toContain("item-1");
			expect(selected).not.toContain("item-3");
			expect(selected).toContain("item-2");
		});

		it("does nothing if none of the provided IDs are in selection", () => {
			setupParams([["selected", "item-1"]]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.clearItems(["item-99"]);
			});

			const selected = getSelectionFromPush();
			expect(selected).toContain("item-1");
		});
	});

	// -------------------------------------------------------------------------
	// Existing URL params preservation
	// -------------------------------------------------------------------------

	describe("preserveExistingParams", () => {
		it("preserves page param in URL after selection change", () => {
			setupParams([["page", "3"]]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleItemSelectionChange("item-1", true);
			});

			const url: string = mockPush.mock.calls[0]![0];
			const params = new URLSearchParams(url.replace(/^\?/, ""));
			expect(params.get("page")).toBe("3");
		});

		it("preserves perPage param in URL after selection change", () => {
			setupParams([["perPage", "20"]]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleItemSelectionChange("item-1", true);
			});

			const url: string = mockPush.mock.calls[0]![0];
			const params = new URLSearchParams(url.replace(/^\?/, ""));
			expect(params.get("perPage")).toBe("20");
		});

		it("preserves filter_ params in URL after selection change", () => {
			setupParams([["filter_status", "ACTIVE"]]);
			const { result } = renderHook(() => useSelection());

			act(() => {
				result.current.handleItemSelectionChange("item-1", true);
			});

			const url: string = mockPush.mock.calls[0]![0];
			const params = new URLSearchParams(url.replace(/^\?/, ""));
			expect(params.get("filter_status")).toBe("ACTIVE");
		});
	});
});
