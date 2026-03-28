import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
	CardHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-header">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		card: "chart-card",
	},
}));

import { ListSkeleton } from "../skeletons/list-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ListSkeleton", () => {
	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	it("renders with role=status", () => {
		render(<ListSkeleton />);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has aria-busy=true", () => {
		render(<ListSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("has default aria-label", () => {
		render(<ListSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement de la liste");
	});

	it("accepts a custom aria-label", () => {
		render(<ListSkeleton ariaLabel="Chargement des commandes" />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement des commandes");
	});

	// -------------------------------------------------------------------------
	// Structure
	// -------------------------------------------------------------------------

	it("renders a Card", () => {
		render(<ListSkeleton />);

		expect(screen.getByTestId("card")).toBeInTheDocument();
	});

	it("renders skeleton placeholders for header", () => {
		render(<ListSkeleton />);

		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	// -------------------------------------------------------------------------
	// itemCount prop
	// -------------------------------------------------------------------------

	it("renders 5 list items by default", () => {
		render(<ListSkeleton />);

		// Each item has a border p-3 container
		const { container } = render(<ListSkeleton />);
		const items = container.querySelectorAll(".border.p-3");
		expect(items).toHaveLength(5);
	});

	it("renders the specified number of list items", () => {
		const { container } = render(<ListSkeleton itemCount={3} />);

		const items = container.querySelectorAll(".border.p-3");
		expect(items).toHaveLength(3);
	});

	it("renders 8 list items when itemCount=8", () => {
		const { container } = render(<ListSkeleton itemCount={8} />);

		const items = container.querySelectorAll(".border.p-3");
		expect(items).toHaveLength(8);
	});

	it("renders zero list items when itemCount=0", () => {
		const { container } = render(<ListSkeleton itemCount={0} />);

		const items = container.querySelectorAll(".border.p-3");
		expect(items).toHaveLength(0);
	});
});
