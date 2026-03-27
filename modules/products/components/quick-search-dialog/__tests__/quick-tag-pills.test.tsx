import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Fixtures ────────────────────────────────────────────────────────────────

import { QuickTagPills } from "../quick-tag-pills";
import type { QuickSearchProductType } from "../constants";

const mockProductTypes: QuickSearchProductType[] = [
	{ slug: "bague", label: "Bagues" },
	{ slug: "collier", label: "Colliers" },
	{ slug: "bracelet", label: "Bracelets" },
];

afterEach(() => {
	cleanup();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("QuickTagPills", () => {
	let onSelect: (label: string) => void;

	beforeEach(() => {
		onSelect = vi.fn();
	});

	it("renders nothing when productTypes is empty", () => {
		const { container } = render(<QuickTagPills productTypes={[]} onSelect={onSelect} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders a button for each product type", () => {
		render(<QuickTagPills productTypes={mockProductTypes} onSelect={onSelect} />);
		expect(screen.getByRole("button", { name: /rechercher bagues/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /rechercher colliers/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /rechercher bracelets/i })).toBeInTheDocument();
	});

	it("displays the label text inside each button", () => {
		render(<QuickTagPills productTypes={mockProductTypes} onSelect={onSelect} />);
		expect(screen.getByText("Bagues")).toBeInTheDocument();
		expect(screen.getByText("Colliers")).toBeInTheDocument();
		expect(screen.getByText("Bracelets")).toBeInTheDocument();
	});

	it("calls onSelect with label when a button is clicked", async () => {
		render(<QuickTagPills productTypes={mockProductTypes} onSelect={onSelect} />);
		await userEvent.click(screen.getByRole("button", { name: /rechercher bagues/i }));
		expect(onSelect).toHaveBeenCalledOnce();
		expect(onSelect).toHaveBeenCalledWith("Bagues");
	});

	it("calls onSelect with the correct label for each pill", async () => {
		render(<QuickTagPills productTypes={mockProductTypes} onSelect={onSelect} />);
		await userEvent.click(screen.getByRole("button", { name: /rechercher colliers/i }));
		expect(onSelect).toHaveBeenCalledWith("Colliers");
	});

	it("has aria-label with category name on each button", () => {
		render(<QuickTagPills productTypes={mockProductTypes} onSelect={onSelect} />);
		expect(screen.getByRole("button", { name: "Rechercher Bagues" })).toBeInTheDocument();
	});

	it("renders group with accessible label", () => {
		render(<QuickTagPills productTypes={mockProductTypes} onSelect={onSelect} />);
		expect(screen.getByRole("group", { name: /suggestions de categories/i })).toBeInTheDocument();
	});

	it("applies text-sm class when size is sm (default)", () => {
		render(<QuickTagPills productTypes={[mockProductTypes[0]!]} onSelect={onSelect} size="sm" />);
		const button = screen.getByRole("button", { name: /rechercher bagues/i });
		expect(button).toHaveClass("text-sm");
	});

	it("applies text-xs class when size is xs", () => {
		render(<QuickTagPills productTypes={[mockProductTypes[0]!]} onSelect={onSelect} size="xs" />);
		const button = screen.getByRole("button", { name: /rechercher bagues/i });
		expect(button).toHaveClass("text-xs");
	});

	it("applies justify-center when centered is true", () => {
		const { container } = render(
			<QuickTagPills productTypes={mockProductTypes} onSelect={onSelect} centered />,
		);
		const group = container.querySelector('[role="group"]');
		expect(group).toHaveClass("justify-center");
	});

	it("does not apply justify-center when centered is false (default)", () => {
		const { container } = render(
			<QuickTagPills productTypes={mockProductTypes} onSelect={onSelect} />,
		);
		const group = container.querySelector('[role="group"]');
		expect(group).not.toHaveClass("justify-center");
	});

	it("renders a single product type correctly", () => {
		render(<QuickTagPills productTypes={[mockProductTypes[0]!]} onSelect={onSelect} />);
		expect(screen.getAllByRole("button")).toHaveLength(1);
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});

	it("each button has type='button'", () => {
		render(<QuickTagPills productTypes={mockProductTypes} onSelect={onSelect} />);
		const buttons = screen.getAllByRole("button");
		buttons.forEach((btn) => {
			expect(btn).toHaveAttribute("type", "button");
		});
	});
});
