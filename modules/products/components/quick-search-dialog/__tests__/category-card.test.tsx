import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<a href={href} onClick={onClick} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/animations/tap", () => ({
	Tap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { CategoryCard } from "../category-card";
import type { QuickSearchProductType } from "../constants";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockType: QuickSearchProductType = {
	slug: "bague",
	label: "Bagues",
};

afterEach(() => {
	cleanup();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CategoryCard", () => {
	let onSelect: () => void;

	beforeEach(() => {
		onSelect = vi.fn();
	});

	it("renders a link with the correct href", () => {
		const { container } = render(<CategoryCard type={mockType} onSelect={onSelect} />);
		const link = container.querySelector("a");
		expect(link).toHaveAttribute("href", "/produits/bague");
	});

	it("displays the type label", () => {
		render(<CategoryCard type={mockType} onSelect={onSelect} />);
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});

	it("calls onSelect when the link is clicked", async () => {
		const { container } = render(<CategoryCard type={mockType} onSelect={onSelect} />);
		const link = container.querySelector("a")!;
		await userEvent.click(link);
		expect(onSelect).toHaveBeenCalledOnce();
	});

	describe("full variant (default)", () => {
		it("does not render the Sparkles icon in full variant", () => {
			const { container } = render(
				<CategoryCard type={mockType} onSelect={onSelect} variant="full" />,
			);
			// Sparkles icon only shown in compact mode
			expect(container.querySelector("svg")).not.toBeInTheDocument();
		});

		it("applies block layout class in full variant", () => {
			const { container } = render(
				<CategoryCard type={mockType} onSelect={onSelect} variant="full" />,
			);
			const link = container.querySelector("a");
			expect(link).toHaveClass("block");
		});

		it("does not apply flex layout class in full variant", () => {
			const { container } = render(
				<CategoryCard type={mockType} onSelect={onSelect} variant="full" />,
			);
			const link = container.querySelector("a");
			expect(link).not.toHaveClass("flex");
		});
	});

	describe("compact variant", () => {
		it("renders the Sparkles icon in compact variant", () => {
			const { container } = render(
				<CategoryCard type={mockType} onSelect={onSelect} variant="compact" />,
			);
			expect(container.querySelector("svg")).toBeInTheDocument();
		});

		it("Sparkles icon has aria-hidden in compact variant", () => {
			const { container } = render(
				<CategoryCard type={mockType} onSelect={onSelect} variant="compact" />,
			);
			const svg = container.querySelector("svg");
			expect(svg).toHaveAttribute("aria-hidden", "true");
		});

		it("applies flex layout class in compact variant", () => {
			const { container } = render(
				<CategoryCard type={mockType} onSelect={onSelect} variant="compact" />,
			);
			const link = container.querySelector("a");
			expect(link).toHaveClass("flex");
		});

		it("applies truncate to span in compact variant", () => {
			const { container } = render(
				<CategoryCard type={mockType} onSelect={onSelect} variant="compact" />,
			);
			const span = container.querySelector("span");
			expect(span).toHaveClass("truncate");
		});

		it("highlights query match in label via HighlightMatch in compact variant", () => {
			const { container } = render(
				<CategoryCard type={mockType} onSelect={onSelect} variant="compact" query="bag" />,
			);
			const marks = container.querySelectorAll("mark");
			expect(marks.length).toBeGreaterThanOrEqual(1);
		});

		it("does not render marks when query is empty in compact variant", () => {
			const { container } = render(
				<CategoryCard type={mockType} onSelect={onSelect} variant="compact" query="" />,
			);
			expect(container.querySelectorAll("mark")).toHaveLength(0);
		});

		it("renders label without highlight when no query provided", () => {
			render(<CategoryCard type={mockType} onSelect={onSelect} variant="compact" />);
			expect(screen.getByText("Bagues")).toBeInTheDocument();
		});
	});

	it("link has focus-visible ring classes for accessibility", () => {
		const { container } = render(<CategoryCard type={mockType} onSelect={onSelect} />);
		const link = container.querySelector("a");
		expect(link).toHaveClass("focus-visible:outline-none");
	});

	it("renders with a different slug in the href", () => {
		const type: QuickSearchProductType = { slug: "collier", label: "Colliers" };
		const { container } = render(<CategoryCard type={type} onSelect={onSelect} />);
		expect(container.querySelector("a")).toHaveAttribute("href", "/produits/collier");
	});
});
