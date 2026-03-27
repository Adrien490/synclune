import type React from "react";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// ============================================================================
// GLOBAL SETUP
// ============================================================================

beforeAll(() => {
	if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
		vi.stubGlobal("CSS", { supports: () => false });
	}
});

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/textarea", () => ({
	Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
} from "../input-group";

// ============================================================================
// InputGroup
// ============================================================================

describe("InputGroup", () => {
	afterEach(cleanup);

	it("has role='group' and data-slot='input-group'", () => {
		render(<InputGroup data-testid="group">content</InputGroup>);
		const el = screen.getByTestId("group");
		expect(el).toHaveAttribute("role", "group");
		expect(el).toHaveAttribute("data-slot", "input-group");
	});

	it("renders children", () => {
		render(<InputGroup>Group content</InputGroup>);
		expect(screen.getByText("Group content")).toBeInTheDocument();
	});
});

// ============================================================================
// InputGroupAddon
// ============================================================================

describe("InputGroupAddon", () => {
	afterEach(cleanup);

	it("has role='presentation' and data-slot='input-group-addon'", () => {
		render(<InputGroupAddon data-testid="addon">label</InputGroupAddon>);
		const el = screen.getByTestId("addon");
		expect(el).toHaveAttribute("role", "presentation");
		expect(el).toHaveAttribute("data-slot", "input-group-addon");
	});

	it("applies default data-align of 'inline-start'", () => {
		render(<InputGroupAddon data-testid="addon">label</InputGroupAddon>);
		expect(screen.getByTestId("addon")).toHaveAttribute("data-align", "inline-start");
	});

	it("reflects align prop in data-align", () => {
		render(
			<InputGroupAddon data-testid="addon" align="inline-end">
				label
			</InputGroupAddon>,
		);
		expect(screen.getByTestId("addon")).toHaveAttribute("data-align", "inline-end");
	});

	it("focuses sibling input when addon is clicked", () => {
		render(
			<InputGroup>
				<InputGroupAddon data-testid="addon">label</InputGroupAddon>
				<InputGroupInput aria-label="search" />
			</InputGroup>,
		);
		const input = screen.getByRole("textbox", { name: "search" });
		const addon = screen.getByTestId("addon");
		fireEvent.click(addon);
		expect(document.activeElement).toBe(input);
	});

	it("focuses sibling input when Enter key is pressed on addon", () => {
		render(
			<InputGroup>
				<InputGroupAddon data-testid="addon">label</InputGroupAddon>
				<InputGroupInput aria-label="search" />
			</InputGroup>,
		);
		const input = screen.getByRole("textbox", { name: "search" });
		const addon = screen.getByTestId("addon");
		fireEvent.keyDown(addon, { key: "Enter" });
		expect(document.activeElement).toBe(input);
	});

	it("does NOT focus input when clicking a button child inside addon", () => {
		render(
			<InputGroup>
				<InputGroupAddon data-testid="addon">
					<button type="button" data-testid="inner-btn">
						Clear
					</button>
				</InputGroupAddon>
				<InputGroupInput aria-label="search" />
			</InputGroup>,
		);
		const input = screen.getByRole("textbox", { name: "search" });
		const innerBtn = screen.getByTestId("inner-btn");
		fireEvent.click(innerBtn);
		expect(document.activeElement).not.toBe(input);
	});
});

// ============================================================================
// InputGroupButton
// ============================================================================

describe("InputGroupButton", () => {
	afterEach(cleanup);

	it("renders as a button element", () => {
		render(<InputGroupButton data-testid="btn">Submit</InputGroupButton>);
		const el = screen.getByTestId("btn");
		expect(el.tagName).toBe("BUTTON");
	});

	it("defaults to type='button'", () => {
		render(<InputGroupButton data-testid="btn">Submit</InputGroupButton>);
		expect(screen.getByTestId("btn")).toHaveAttribute("type", "button");
	});
});

// ============================================================================
// InputGroupInput
// ============================================================================

describe("InputGroupInput", () => {
	afterEach(cleanup);

	it("has data-slot='input-group-control'", () => {
		render(<InputGroupInput data-testid="input" aria-label="text input" />);
		expect(screen.getByTestId("input")).toHaveAttribute("data-slot", "input-group-control");
	});

	it("renders as an input element", () => {
		render(<InputGroupInput data-testid="input" aria-label="text input" />);
		expect(screen.getByTestId("input").tagName).toBe("INPUT");
	});
});

// ============================================================================
// InputGroupTextarea
// ============================================================================

describe("InputGroupTextarea", () => {
	afterEach(cleanup);

	it("has data-slot='input-group-control'", () => {
		render(<InputGroupTextarea data-testid="textarea" aria-label="text area" />);
		expect(screen.getByTestId("textarea")).toHaveAttribute("data-slot", "input-group-control");
	});

	it("renders as a textarea element", () => {
		render(<InputGroupTextarea data-testid="textarea" aria-label="text area" />);
		expect(screen.getByTestId("textarea").tagName).toBe("TEXTAREA");
	});
});

// ============================================================================
// InputGroupText
// ============================================================================

describe("InputGroupText", () => {
	afterEach(cleanup);

	it("renders as a span element", () => {
		render(<InputGroupText data-testid="text">EUR</InputGroupText>);
		const el = screen.getByTestId("text");
		expect(el.tagName).toBe("SPAN");
	});

	it("renders children", () => {
		render(<InputGroupText>EUR</InputGroupText>);
		expect(screen.getByText("EUR")).toBeInTheDocument();
	});
});
