import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseSelection } = vi.hoisted(() => ({
	mockUseSelection: vi.fn(),
}));

vi.mock("@/shared/hooks/use-selection", () => ({
	useSelection: mockUseSelection,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { SelectionProvider, useSelectionContext } from "../selection-context";

// ============================================================================
// Helpers
// ============================================================================

const mockSelectionReturn = {
	isSelected: vi.fn(),
	handleItemSelectionChange: vi.fn(),
	areAllSelected: vi.fn(),
	areSomeSelected: vi.fn(),
	handleSelectionChange: vi.fn(),
	getSelectedCount: vi.fn(() => 0),
	selectedItems: [] as string[],
	isPending: false,
	clearAll: vi.fn(),
	clearItems: vi.fn(),
};

function wrapper({ children }: { children: React.ReactNode }) {
	return <SelectionProvider>{children}</SelectionProvider>;
}

// ============================================================================
// Tests
// ============================================================================

describe("SelectionContext", () => {
	it("throws when useSelectionContext is used outside provider", () => {
		expect(() => {
			renderHook(() => useSelectionContext());
		}).toThrow("useSelectionContext doit être utilisé à l'intérieur d'un SelectionProvider");
	});

	it("provides selection context values inside provider", () => {
		mockUseSelection.mockReturnValue(mockSelectionReturn);

		const { result } = renderHook(() => useSelectionContext(), { wrapper });

		expect(result.current.isSelected).toBeDefined();
		expect(result.current.handleItemSelectionChange).toBeDefined();
		expect(result.current.areAllSelected).toBeDefined();
		expect(result.current.areSomeSelected).toBeDefined();
		expect(result.current.handleSelectionChange).toBeDefined();
		expect(result.current.getSelectedCount).toBeDefined();
		expect(result.current.selectedItems).toEqual([]);
		expect(result.current.isPending).toBe(false);
		expect(result.current.clearSelection).toBeDefined();
		expect(result.current.clearItems).toBeDefined();
	});

	it("passes selectionKey to useSelection", () => {
		mockUseSelection.mockReturnValue(mockSelectionReturn);

		function customWrapper({ children }: { children: React.ReactNode }) {
			return <SelectionProvider selectionKey="custom-key">{children}</SelectionProvider>;
		}

		renderHook(() => useSelectionContext(), { wrapper: customWrapper });

		expect(mockUseSelection).toHaveBeenCalledWith("custom-key");
	});

	it("uses default selectionKey 'selected' when not provided", () => {
		mockUseSelection.mockReturnValue(mockSelectionReturn);

		renderHook(() => useSelectionContext(), { wrapper });

		expect(mockUseSelection).toHaveBeenCalledWith("selected");
	});

	it("maps clearAll to clearSelection", () => {
		const clearAllFn = vi.fn();
		mockUseSelection.mockReturnValue({ ...mockSelectionReturn, clearAll: clearAllFn });

		const { result } = renderHook(() => useSelectionContext(), { wrapper });

		result.current.clearSelection();
		expect(clearAllFn).toHaveBeenCalled();
	});
});
