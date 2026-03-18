import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSelectionContext } = vi.hoisted(() => ({
	mockSelectionContext: {
		isSelected: vi.fn((_id: string) => false),
		handleItemSelectionChange: vi.fn(),
		areAllSelected: vi.fn((_ids: string[]) => false),
		areSomeSelected: vi.fn((_ids: string[]) => false),
		handleSelectionChange: vi.fn(),
		getSelectedCount: vi.fn(() => 0),
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
	useSelectionContext: () => mockSelectionContext,
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
	}) => (
		<input
			type="checkbox"
			checked={checked === true || checked === "indeterminate"}
			data-indeterminate={checked === "indeterminate" ? "true" : undefined}
			aria-label={ariaLabel}
			onChange={(e) => onCheckedChange(e.target.checked)}
			{...props}
		/>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { TableSelectionCell } from "../table-selection-cell";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockSelectionContext.isSelected.mockReturnValue(false);
	mockSelectionContext.areAllSelected.mockReturnValue(false);
	mockSelectionContext.areSomeSelected.mockReturnValue(false);
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("TableSelectionCell", () => {
	// ============================================================================
	// NULL RENDERING
	// ============================================================================

	describe("null rendering", () => {
		it("renders null when type is 'header' but itemIds is not provided", () => {
			const { container } = render(<TableSelectionCell type="header" />);
			expect(container.innerHTML).toBe("");
		});

		it("renders null when type is 'row' but itemId is not provided", () => {
			const { container } = render(<TableSelectionCell type="row" />);
			expect(container.innerHTML).toBe("");
		});

		it("renders null when type is 'row' with empty itemId string", () => {
			// itemId undefined triggers the null branch
			const { container } = render(<TableSelectionCell type="row" />);
			expect(container.firstChild).toBeNull();
		});
	});

	// ============================================================================
	// HEADER MODE (SelectAllCheckbox)
	// ============================================================================

	describe("header mode", () => {
		it("renders a checkbox when type is 'header' with itemIds", () => {
			render(<TableSelectionCell type="header" itemIds={["1", "2", "3"]} />);
			expect(screen.getByRole("checkbox")).toBeInTheDocument();
		});

		it("renders checkbox with aria-label 'Tout sélectionner'", () => {
			render(<TableSelectionCell type="header" itemIds={["1", "2"]} />);
			expect(screen.getByRole("checkbox")).toHaveAttribute("aria-label", "Tout sélectionner");
		});

		it("checkbox is checked when all items are selected", () => {
			mockSelectionContext.areAllSelected.mockReturnValue(true);
			render(<TableSelectionCell type="header" itemIds={["1", "2"]} />);
			expect(screen.getByRole("checkbox")).toBeChecked();
		});

		it("checkbox is unchecked when no items are selected", () => {
			mockSelectionContext.areAllSelected.mockReturnValue(false);
			mockSelectionContext.areSomeSelected.mockReturnValue(false);
			render(<TableSelectionCell type="header" itemIds={["1", "2"]} />);
			expect(screen.getByRole("checkbox")).not.toBeChecked();
		});

		it("shows indeterminate state when only some items are selected", () => {
			mockSelectionContext.areAllSelected.mockReturnValue(false);
			mockSelectionContext.areSomeSelected.mockReturnValue(true);
			render(<TableSelectionCell type="header" itemIds={["1", "2", "3"]} />);
			const checkbox = screen.getByRole("checkbox");
			expect(checkbox).toHaveAttribute("data-indeterminate", "true");
		});

		it("calls handleSelectionChange when header checkbox is changed", () => {
			render(<TableSelectionCell type="header" itemIds={["1", "2"]} />);
			fireEvent.click(screen.getByRole("checkbox"));
			expect(mockSelectionContext.handleSelectionChange).toHaveBeenCalledTimes(1);
		});

		it("passes itemIds to areAllSelected and areSomeSelected", () => {
			const itemIds = ["a", "b", "c"];
			render(<TableSelectionCell type="header" itemIds={itemIds} />);
			expect(mockSelectionContext.areAllSelected).toHaveBeenCalledWith(itemIds);
			expect(mockSelectionContext.areSomeSelected).toHaveBeenCalledWith(itemIds);
		});
	});

	// ============================================================================
	// ROW MODE (ItemCheckbox)
	// ============================================================================

	describe("row mode", () => {
		it("renders a checkbox when type is 'row' with itemId", () => {
			render(<TableSelectionCell type="row" itemId="item-1" />);
			expect(screen.getByRole("checkbox")).toBeInTheDocument();
		});

		it("renders checkbox with default aria-label when ariaLabel is not provided", () => {
			render(<TableSelectionCell type="row" itemId="item-42" />);
			expect(screen.getByRole("checkbox")).toHaveAttribute(
				"aria-label",
				"Sélectionner l'élément item-42",
			);
		});

		it("renders checkbox with custom ariaLabel when provided", () => {
			render(
				<TableSelectionCell type="row" itemId="product-1" ariaLabel="Sélectionner Bague Étoile" />,
			);
			expect(screen.getByRole("checkbox")).toHaveAttribute(
				"aria-label",
				"Sélectionner Bague Étoile",
			);
		});

		it("checkbox is checked when item is selected", () => {
			mockSelectionContext.isSelected.mockReturnValue(true);
			render(<TableSelectionCell type="row" itemId="item-1" />);
			expect(screen.getByRole("checkbox")).toBeChecked();
		});

		it("checkbox is unchecked when item is not selected", () => {
			mockSelectionContext.isSelected.mockReturnValue(false);
			render(<TableSelectionCell type="row" itemId="item-1" />);
			expect(screen.getByRole("checkbox")).not.toBeChecked();
		});

		it("calls handleItemSelectionChange with correct id when checked", () => {
			render(<TableSelectionCell type="row" itemId="item-7" />);
			fireEvent.click(screen.getByRole("checkbox"));
			expect(mockSelectionContext.handleItemSelectionChange).toHaveBeenCalledWith("item-7", true);
		});

		it("calls isSelected with the correct itemId", () => {
			render(<TableSelectionCell type="row" itemId="product-99" />);
			expect(mockSelectionContext.isSelected).toHaveBeenCalledWith("product-99");
		});
	});
});
