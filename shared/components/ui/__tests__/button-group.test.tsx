import type React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: (props: React.HTMLAttributes<HTMLHRElement>) => <hr {...props} />,
}));

vi.mock("@radix-ui/react-slot", () => ({
	Slot: ({
		children,
		...props
	}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
		<div data-radix-slot {...props}>
			{children}
		</div>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "../button-group";

// ============================================================================
// ButtonGroup
// ============================================================================

describe("ButtonGroup", () => {
	afterEach(cleanup);

	it("has role='group' and data-slot='button-group'", () => {
		render(<ButtonGroup data-testid="group">content</ButtonGroup>);
		const el = screen.getByTestId("group");
		expect(el).toHaveAttribute("role", "group");
		expect(el).toHaveAttribute("data-slot", "button-group");
	});

	it("has no data-orientation attribute when orientation is not provided", () => {
		render(<ButtonGroup data-testid="group">content</ButtonGroup>);
		// CVA default is "horizontal" but the prop is not forwarded if undefined
		const el = screen.getByTestId("group");
		expect(el).not.toHaveAttribute("data-orientation");
	});

	it("reflects orientation prop in data-orientation", () => {
		render(
			<ButtonGroup data-testid="group" orientation="vertical">
				content
			</ButtonGroup>,
		);
		expect(screen.getByTestId("group")).toHaveAttribute("data-orientation", "vertical");
	});

	it("reflects horizontal orientation in data-orientation", () => {
		render(
			<ButtonGroup data-testid="group" orientation="horizontal">
				content
			</ButtonGroup>,
		);
		expect(screen.getByTestId("group")).toHaveAttribute("data-orientation", "horizontal");
	});

	it("renders children inside the group", () => {
		render(
			<ButtonGroup>
				<button type="button">A</button>
				<button type="button">B</button>
			</ButtonGroup>,
		);
		expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
	});
});

// ============================================================================
// ButtonGroupText
// ============================================================================

describe("ButtonGroupText", () => {
	afterEach(cleanup);

	it("renders children", () => {
		render(<ButtonGroupText data-testid="text">Label</ButtonGroupText>);
		expect(screen.getByText("Label")).toBeInTheDocument();
	});

	it("renders as div by default", () => {
		render(<ButtonGroupText data-testid="text">Label</ButtonGroupText>);
		expect(screen.getByTestId("text").tagName).toBe("DIV");
	});

	it("renders Slot component when asChild is true", () => {
		render(
			<ButtonGroupText data-testid="text" asChild>
				<span>Label</span>
			</ButtonGroupText>,
		);
		expect(screen.getByTestId("text")).toHaveAttribute("data-radix-slot");
	});
});

// ============================================================================
// ButtonGroupSeparator
// ============================================================================

describe("ButtonGroupSeparator", () => {
	afterEach(cleanup);

	it("has data-slot='button-group-separator'", () => {
		render(<ButtonGroupSeparator data-testid="sep" />);
		expect(screen.getByTestId("sep")).toHaveAttribute("data-slot", "button-group-separator");
	});

	it("renders as an hr element via Separator mock", () => {
		render(<ButtonGroupSeparator data-testid="sep" />);
		expect(screen.getByTestId("sep").tagName).toBe("HR");
	});
});
