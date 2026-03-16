import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockContext } = vi.hoisted(() => ({
	mockContext: {
		isSelected: vi.fn().mockReturnValue(false),
		handleItemSelectionChange: vi.fn(),
		areAllSelected: vi.fn().mockReturnValue(false),
		areSomeSelected: vi.fn().mockReturnValue(false),
		handleSelectionChange: vi.fn(),
		getSelectedCount: vi.fn().mockReturnValue(0),
		selectedItems: [] as string[],
		isPending: false,
		clearSelection: vi.fn(),
		clearItems: vi.fn(),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/contexts/selection-context", () => ({
	useSelectionContext: () => mockContext,
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({
		checked,
		onCheckedChange,
		"aria-label": ariaLabel,
		...props
	}: {
		checked: boolean | "indeterminate";
		onCheckedChange: (checked: boolean | "indeterminate") => void;
		"aria-label"?: string;
	}) => {
		const { createElement } = require("react");
		return createElement("input", {
			type: "checkbox",
			"aria-label": ariaLabel,
			checked: checked === "indeterminate" ? false : checked,
			"data-indeterminate": checked === "indeterminate" ? "true" : undefined,
			onChange: (e: { target: { checked: boolean } }) => onCheckedChange(e.target.checked),
			...props,
		});
	},
}));

// Import AFTER mocks
import { SelectAllCheckbox } from "../select-all-checkbox";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockContext.areAllSelected.mockReturnValue(false);
	mockContext.areSomeSelected.mockReturnValue(false);
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("SelectAllCheckbox", () => {
	const itemIds = ["item-1", "item-2", "item-3"];

	it("renders an unchecked checkbox when no items are selected", () => {
		mockContext.areAllSelected.mockReturnValue(false);
		mockContext.areSomeSelected.mockReturnValue(false);

		render(<SelectAllCheckbox itemIds={itemIds} />);

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).not.toBeChecked();
	});

	it("renders a checked checkbox when all items are selected", () => {
		mockContext.areAllSelected.mockReturnValue(true);
		mockContext.areSomeSelected.mockReturnValue(false);

		render(<SelectAllCheckbox itemIds={itemIds} />);

		expect(screen.getByRole("checkbox")).toBeChecked();
	});

	it("renders an indeterminate checkbox when some items are selected", () => {
		mockContext.areAllSelected.mockReturnValue(false);
		mockContext.areSomeSelected.mockReturnValue(true);

		render(<SelectAllCheckbox itemIds={itemIds} />);

		expect(screen.getByRole("checkbox")).toHaveAttribute("data-indeterminate", "true");
	});

	it("calls handleSelectionChange with true when checking", () => {
		mockContext.areAllSelected.mockReturnValue(false);
		mockContext.areSomeSelected.mockReturnValue(false);

		render(<SelectAllCheckbox itemIds={itemIds} />);

		fireEvent.click(screen.getByRole("checkbox"));

		expect(mockContext.handleSelectionChange).toHaveBeenCalledWith(itemIds, true);
	});

	it("has correct aria-label for accessibility", () => {
		render(<SelectAllCheckbox itemIds={itemIds} />);

		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-label", "Tout sélectionner");
	});

	it("passes the itemIds to areAllSelected and areSomeSelected", () => {
		render(<SelectAllCheckbox itemIds={itemIds} />);

		expect(mockContext.areAllSelected).toHaveBeenCalledWith(itemIds);
		expect(mockContext.areSomeSelected).toHaveBeenCalledWith(itemIds);
	});
});
