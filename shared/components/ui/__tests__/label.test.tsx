import { cleanup, render, screen } from "@testing-library/react";
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
import { Label } from "../label";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Label", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a label element", () => {
		render(<Label>Name</Label>);
		expect(screen.getByText("Name")).toBeInTheDocument();
	});

	it("has data-slot=label", () => {
		const { container } = render(<Label>Label</Label>);
		expect(container.querySelector("[data-slot='label']")).toBeInTheDocument();
	});

	it("associates with a form element via htmlFor", () => {
		render(
			<>
				<Label htmlFor="email-input">Email</Label>
				<input id="email-input" />
			</>,
		);
		expect(screen.getByText("Email").closest("label")).toHaveAttribute("for", "email-input");
	});

	it("applies custom className", () => {
		const { container } = render(<Label className="font-bold">Bold Label</Label>);
		expect(container.querySelector("[data-slot='label']")).toHaveClass("font-bold");
	});

	it("renders children", () => {
		render(<Label>First Name</Label>);
		expect(screen.getByText("First Name")).toBeInTheDocument();
	});
});
