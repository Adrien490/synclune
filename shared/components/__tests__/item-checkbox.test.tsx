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
		onCheckedChange: (checked: boolean) => void;
		"aria-label"?: string;
	}) => {
		const { createElement } = require("react");
		return createElement("input", {
			type: "checkbox",
			"aria-label": ariaLabel,
			checked: checked === "indeterminate" ? false : checked,
			onChange: (e: { target: { checked: boolean } }) => onCheckedChange(e.target.checked),
			...props,
		});
	},
}));

// Import AFTER mocks
import { ItemCheckbox } from "../item-checkbox";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockContext.isSelected.mockReturnValue(false);
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ItemCheckbox", () => {
	it("renders a checkbox element", () => {
		render(<ItemCheckbox itemId="product-1" />);

		expect(screen.getByRole("checkbox")).toBeInTheDocument();
	});

	it("renders as unchecked when item is not selected", () => {
		mockContext.isSelected.mockReturnValue(false);

		render(<ItemCheckbox itemId="product-1" />);

		expect(screen.getByRole("checkbox")).not.toBeChecked();
	});

	it("renders as checked when item is selected", () => {
		mockContext.isSelected.mockReturnValue(true);

		render(<ItemCheckbox itemId="product-42" />);

		expect(screen.getByRole("checkbox")).toBeChecked();
	});

	it("calls handleItemSelectionChange with itemId and true when checked", () => {
		mockContext.isSelected.mockReturnValue(false);

		render(<ItemCheckbox itemId="product-1" />);

		fireEvent.click(screen.getByRole("checkbox"));

		expect(mockContext.handleItemSelectionChange).toHaveBeenCalledWith("product-1", true);
	});

	it("uses custom ariaLabel when provided", () => {
		render(<ItemCheckbox itemId="product-1" ariaLabel="Sélectionner Bague Lune" />);

		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-label", "Sélectionner Bague Lune");
	});

	it("uses default aria-label with itemId when no ariaLabel provided", () => {
		render(<ItemCheckbox itemId="abc-123" />);

		expect(screen.getByRole("checkbox")).toHaveAttribute(
			"aria-label",
			"Sélectionner l'élément abc-123",
		);
	});

	it("queries selection state with the correct itemId", () => {
		render(<ItemCheckbox itemId="order-99" />);

		expect(mockContext.isSelected).toHaveBeenCalledWith("order-99");
	});
});
