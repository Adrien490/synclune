import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { RadioFilterItem } from "../radio-filter-item";

// ============================================================================
// HELPERS
// ============================================================================

const defaultProps = {
	id: "filter-sort-price",
	name: "sort",
	value: "price_asc",
	checked: false,
	onCheckedChange: vi.fn(),
	children: "Prix croissant",
};

// ============================================================================
// TESTS
// ============================================================================

describe("RadioFilterItem", () => {
	afterEach(cleanup);

	// ============================================================================
	// RENDERING
	// ============================================================================

	it("renders label with children text", () => {
		render(<RadioFilterItem {...defaultProps} />);
		expect(screen.getByText("Prix croissant")).toBeInTheDocument();
	});

	it("renders a radio input with the correct id and name", () => {
		render(<RadioFilterItem {...defaultProps} />);
		const radio = screen.getByRole("radio");
		expect(radio).toHaveAttribute("id", "filter-sort-price");
		expect(radio).toHaveAttribute("name", "sort");
		expect(radio).toHaveAttribute("value", "price_asc");
	});

	it("label has htmlFor matching radio input id", () => {
		render(<RadioFilterItem {...defaultProps} />);
		const radio = screen.getByRole("radio");
		const label = radio.closest("label");
		expect(label).toHaveAttribute("for", "filter-sort-price");
	});

	// ============================================================================
	// SELECTION STATE
	// ============================================================================

	it("applies active background class when checked is true", () => {
		render(<RadioFilterItem {...defaultProps} checked={true} />);
		const radio = screen.getByRole("radio");
		const label = radio.closest("label");
		expect(label?.className).toContain("bg-primary/5");
	});

	it("does not apply active background class when checked is false", () => {
		render(<RadioFilterItem {...defaultProps} checked={false} />);
		const radio = screen.getByRole("radio");
		const label = radio.closest("label");
		expect(label?.className).not.toContain("bg-primary/5");
	});

	// ============================================================================
	// INTERACTION
	// ============================================================================

	it("calls onCheckedChange with true when radio is changed", () => {
		const onCheckedChange = vi.fn();
		render(<RadioFilterItem {...defaultProps} onCheckedChange={onCheckedChange} />);
		const radio = screen.getByRole("radio");
		fireEvent.click(radio);
		expect(onCheckedChange).toHaveBeenCalledOnce();
		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	// ============================================================================
	// TOUCH TARGET SIZE
	// ============================================================================

	it("label has min-h-11 class for 44px minimum touch target", () => {
		render(<RadioFilterItem {...defaultProps} />);
		const radio = screen.getByRole("radio");
		const label = radio.closest("label");
		expect(label?.className).toContain("min-h-11");
	});

	// ============================================================================
	// DESCRIPTION
	// ============================================================================

	it("renders description when provided", () => {
		render(<RadioFilterItem {...defaultProps} description="Du moins cher au plus cher" />);
		expect(screen.getByText("Du moins cher au plus cher")).toBeInTheDocument();
	});

	it("does not render description when not provided", () => {
		const { container } = render(<RadioFilterItem {...defaultProps} />);
		const descSpan = container.querySelector(".text-xs");
		expect(descSpan).toBeNull();
	});

	// ============================================================================
	// DISABLED STATE
	// ============================================================================

	it("disables radio input when disabled is true", () => {
		render(<RadioFilterItem {...defaultProps} disabled={true} />);
		const radio = screen.getByRole("radio");
		expect(radio).toBeDisabled();
	});

	it("applies disabled styling to label when disabled is true", () => {
		render(<RadioFilterItem {...defaultProps} disabled={true} />);
		const radio = screen.getByRole("radio");
		const label = radio.closest("label");
		expect(label?.className).toContain("cursor-not-allowed");
		expect(label?.className).toContain("opacity-50");
	});
});
