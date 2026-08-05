import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({ id, checked, onCheckedChange, ...props }: any) => (
		<input
			type="checkbox"
			id={id}
			checked={checked}
			onChange={(e) => onCheckedChange(e.target.checked)}
			{...props}
		/>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckboxFilterItem } from "../checkbox-filter-item";

// ============================================================================
// HELPERS
// ============================================================================

const defaultProps = {
	id: "filter-color-red",
	checked: false,
	onCheckedChange: vi.fn(),
	children: "Rouge",
};

// ============================================================================
// TESTS
// ============================================================================

describe("CheckboxFilterItem", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders label with children text", () => {
		render(<CheckboxFilterItem {...defaultProps} />);
		expect(screen.getByText("Rouge")).toBeInTheDocument();
	});

	it("renders checkbox with correct id", () => {
		render(<CheckboxFilterItem {...defaultProps} />);
		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).toHaveAttribute("id", "filter-color-red");
	});

	it("label has htmlFor matching checkbox id", () => {
		render(<CheckboxFilterItem {...defaultProps} />);
		const checkbox = screen.getByRole("checkbox");
		const label = checkbox.closest("label");
		expect(label).toHaveAttribute("for", "filter-color-red");
	});

	// ============================================================================
	// CHECKED STATE
	// ============================================================================

	it("applies checked class when checked is true", () => {
		render(<CheckboxFilterItem {...defaultProps} checked={true} />);
		const checkbox = screen.getByRole("checkbox");
		const label = checkbox.closest("label");
		expect(label?.className).toContain("bg-primary/5");
	});

	it("does not apply checked class when checked is false", () => {
		render(<CheckboxFilterItem {...defaultProps} checked={false} />);
		const checkbox = screen.getByRole("checkbox");
		const label = checkbox.closest("label");
		expect(label?.className).not.toContain("bg-primary/5");
	});

	// ============================================================================
	// INTERACTION
	// ============================================================================

	it("calls onCheckedChange when checkbox is clicked", () => {
		const onCheckedChange = vi.fn();
		render(<CheckboxFilterItem {...defaultProps} onCheckedChange={onCheckedChange} />);
		const checkbox = screen.getByRole("checkbox");
		fireEvent.click(checkbox);
		expect(onCheckedChange).toHaveBeenCalledOnce();
		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	// ============================================================================
	// INDICATOR
	// ============================================================================

	it("renders indicator when provided", () => {
		render(<CheckboxFilterItem {...defaultProps} indicator={<span data-testid="color-dot" />} />);
		expect(screen.getByTestId("color-dot")).toBeInTheDocument();
	});

	it("indicator wrapper has aria-hidden='true'", () => {
		render(<CheckboxFilterItem {...defaultProps} indicator={<span data-testid="color-dot" />} />);
		const wrapper = screen.getByTestId("color-dot").parentElement;
		expect(wrapper).toHaveAttribute("aria-hidden", "true");
	});

	it("le wrapper d'indicateur est un conteneur flex (blockifie une pastille inline)", () => {
		// jsdom ne fait pas de layout : on verrouille le MÉCANISME, pas la mesure.
		// Sans `flex`, un <span size-6> passé en indicator reste inline et se peint
		// 2px de large, `width` ignorée (audit panneau de filtres 2026-08-04, P0).
		render(<CheckboxFilterItem {...defaultProps} indicator={<span data-testid="color-dot" />} />);
		const wrapper = screen.getByTestId("color-dot").parentElement;
		expect(wrapper?.className).toContain("flex");
	});

	it("does not render indicator wrapper when indicator is not provided", () => {
		render(<CheckboxFilterItem {...defaultProps} />);
		const ariaHiddenSpan = document.querySelector("[aria-hidden='true']");
		expect(ariaHiddenSpan).toBeNull();
	});

	// ============================================================================
	// DESCRIPTION
	// ============================================================================

	it("renders description text when provided", () => {
		render(<CheckboxFilterItem {...defaultProps} description="Disponible en stock" />);
		expect(screen.getByText("Disponible en stock")).toBeInTheDocument();
	});

	it("does not render description when not provided", () => {
		const { container } = render(<CheckboxFilterItem {...defaultProps} />);
		const descriptionSpan = container.querySelector(".text-xs.mt-0\\.5");
		expect(descriptionSpan).toBeNull();
	});

	// ============================================================================
	// COUNT
	// ============================================================================

	it("renders count in parentheses when provided", () => {
		render(<CheckboxFilterItem {...defaultProps} count={12} />);
		expect(screen.getByText("(12)")).toBeInTheDocument();
	});

	it("does not render count when count is undefined", () => {
		render(<CheckboxFilterItem {...defaultProps} />);
		expect(screen.queryByText(/^\(\d+\)$/)).toBeNull();
	});

	// ============================================================================
	// TOUCH TARGET
	// ============================================================================

	it("label has min-h-11 class for 44px minimum touch target", () => {
		render(<CheckboxFilterItem {...defaultProps} />);
		const checkbox = screen.getByRole("checkbox");
		const label = checkbox.closest("label");
		expect(label?.className).toContain("min-h-11");
	});
});
