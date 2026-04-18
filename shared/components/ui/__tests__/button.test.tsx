import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// Import AFTER mocks
import { Button } from "../button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Button", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a button element by default", () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
	});

	it("has data-slot=button", () => {
		const { container } = render(<Button>Btn</Button>);
		expect(container.querySelector("[data-slot='button']")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(<Button>Save</Button>);
		expect(screen.getByText("Save")).toBeInTheDocument();
	});

	it("calls onClick handler when clicked", async () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>Click</Button>);
		await userEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("is disabled when disabled prop is set", () => {
		render(<Button disabled>Disabled</Button>);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("renders as a child element when asChild is true", () => {
		render(
			<Button asChild>
				<a href="/test">Link</a>
			</Button>,
		);
		expect(screen.getByRole("link", { name: "Link" })).toBeInTheDocument();
	});

	it("forwards aria-label prop", () => {
		render(
			<Button aria-label="Close dialog" size="icon">
				X
			</Button>,
		);
		expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
	});

	it("applies custom className", () => {
		render(<Button className="custom-class">Btn</Button>);
		expect(screen.getByRole("button")).toHaveClass("custom-class");
	});

	it("applies destructive variant class", () => {
		render(<Button variant="destructive">Delete</Button>);
		expect(screen.getByRole("button")).toHaveClass("bg-destructive");
	});

	it("applies outline variant class", () => {
		render(<Button variant="outline">Outline</Button>);
		expect(screen.getByRole("button")).toHaveClass("border");
	});

	it("applies ghost variant class", () => {
		render(<Button variant="ghost">Ghost</Button>);
		expect(screen.getByRole("button")).toHaveClass("hover:bg-accent");
	});

	it("applies link variant class", () => {
		render(<Button variant="link">Link</Button>);
		expect(screen.getByRole("button")).toHaveClass("text-primary");
	});

	it("applies sm size class", () => {
		render(<Button size="sm">Small</Button>);
		expect(screen.getByRole("button")).toHaveClass("h-9");
	});

	it("applies lg size class", () => {
		render(<Button size="lg">Large</Button>);
		expect(screen.getByRole("button")).toHaveClass("h-12");
	});

	it("applies icon size class", () => {
		render(
			<Button size="icon" aria-label="Icon button">
				<svg />
			</Button>,
		);
		expect(screen.getByRole("button")).toHaveClass("size-11");
	});

	it("forwards type=submit", () => {
		render(<Button type="submit">Submit</Button>);
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	it("does not call onClick when disabled", async () => {
		const onClick = vi.fn();
		render(
			<Button disabled onClick={onClick}>
				Disabled
			</Button>,
		);
		await userEvent.click(screen.getByRole("button"));
		expect(onClick).not.toHaveBeenCalled();
	});
});
