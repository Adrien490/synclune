import type React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
		<label {...props}>{children}</label>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: (props: React.HTMLAttributes<HTMLHRElement>) => <hr {...props} />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { FieldSet, FieldLegend, Field, FieldError, FieldSeparator } from "../field";

describe("FieldSet", () => {
	afterEach(cleanup);

	it("renders a fieldset with data-slot", () => {
		render(<FieldSet data-testid="fs">content</FieldSet>);
		const el = screen.getByTestId("fs");
		expect(el.tagName).toBe("FIELDSET");
		expect(el).toHaveAttribute("data-slot", "field-set");
	});
});

describe("FieldLegend", () => {
	afterEach(cleanup);

	it("renders a legend with default variant", () => {
		render(<FieldLegend data-testid="lg">Title</FieldLegend>);
		const el = screen.getByTestId("lg");
		expect(el.tagName).toBe("LEGEND");
		expect(el).toHaveAttribute("data-variant", "legend");
	});

	it("renders with label variant", () => {
		render(
			<FieldLegend data-testid="lg" variant="label">
				Title
			</FieldLegend>,
		);
		expect(screen.getByTestId("lg")).toHaveAttribute("data-variant", "label");
	});
});

describe("Field", () => {
	afterEach(cleanup);

	it("renders with role='group' and data-orientation", () => {
		render(<Field data-testid="f">child</Field>);
		const el = screen.getByTestId("f");
		expect(el).toHaveAttribute("role", "group");
		expect(el).toHaveAttribute("data-orientation", "vertical");
	});

	it("applies custom orientation", () => {
		render(
			<Field data-testid="f" orientation="horizontal">
				child
			</Field>,
		);
		expect(screen.getByTestId("f")).toHaveAttribute("data-orientation", "horizontal");
	});
});

describe("FieldSeparator", () => {
	afterEach(cleanup);

	it("renders with data-content='false' when no children", () => {
		render(<FieldSeparator data-testid="sep" />);
		expect(screen.getByTestId("sep")).toHaveAttribute("data-content", "false");
	});

	it("renders with data-content='true' when children provided", () => {
		render(<FieldSeparator data-testid="sep">ou</FieldSeparator>);
		const el = screen.getByTestId("sep");
		expect(el).toHaveAttribute("data-content", "true");
		expect(screen.getByText("ou")).toBeInTheDocument();
	});
});

describe("FieldError", () => {
	afterEach(cleanup);

	// ============================================================================
	// CHILDREN
	// ============================================================================

	it("renders children directly if provided", () => {
		render(<FieldError errors={["ignored"]}>Custom error</FieldError>);
		expect(screen.getByText("Custom error")).toBeInTheDocument();
	});

	// ============================================================================
	// NULL RENDERING
	// ============================================================================

	it("renders empty alert when errors is undefined", () => {
		render(<FieldError data-testid="fe" />);
		const alert = screen.getByRole("alert");
		expect(alert.textContent).toBe("");
	});

	it("renders empty alert when errors is empty array", () => {
		render(<FieldError errors={[]} />);
		const alert = screen.getByRole("alert");
		expect(alert.textContent).toBe("");
	});

	// ============================================================================
	// STRING ERRORS
	// ============================================================================

	it("renders single string error as text (no list)", () => {
		render(<FieldError errors={["Required field"]} />);
		expect(screen.getByText("Required field")).toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});

	// ============================================================================
	// OBJECT ERRORS
	// ============================================================================

	it("renders single {message} error as text", () => {
		render(<FieldError errors={[{ message: "Invalid email" }]} />);
		expect(screen.getByText("Invalid email")).toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});

	// ============================================================================
	// MULTIPLE ERRORS
	// ============================================================================

	it("renders multiple errors as a list", () => {
		render(<FieldError errors={["Error 1", "Error 2"]} />);
		const list = screen.getByRole("list");
		const items = within(list).getAllByRole("listitem");
		expect(items).toHaveLength(2);
	});

	// ============================================================================
	// DEDUPLICATION
	// ============================================================================

	it("deduplicates identical errors", () => {
		render(<FieldError errors={["Same error", "Same error"]} />);
		// Single error after dedup → no list
		expect(screen.getByText("Same error")).toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});

	// ============================================================================
	// FILTERING
	// ============================================================================

	it("filters undefined entries in errors", () => {
		render(<FieldError errors={[undefined, "Valid error", undefined]} />);
		expect(screen.getByText("Valid error")).toBeInTheDocument();
	});

	it("filters {message: undefined} entries", () => {
		render(<FieldError errors={[{ message: undefined }, { message: "Real error" }]} />);
		expect(screen.getByText("Real error")).toBeInTheDocument();
	});

	// ============================================================================
	// ARIA
	// ============================================================================

	it("has role='alert' and aria-atomic='true'", () => {
		render(<FieldError errors={["test"]} />);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("aria-atomic", "true");
	});

	// ============================================================================
	// GRID ROWS
	// ============================================================================

	it("applies grid-rows-[1fr] when has content", () => {
		const { container } = render(<FieldError errors={["error"]} />);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("grid-rows-[1fr]");
	});

	it("applies grid-rows-[0fr] when no content", () => {
		const { container } = render(<FieldError errors={[]} />);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("grid-rows-[0fr]");
	});
});
