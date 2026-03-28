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
	Skeleton: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
		<div data-testid="skeleton" className={className} style={style} />
	),
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		card: "chart-card",
	},
}));

import { ChartSkeleton } from "../skeletons/chart-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ChartSkeleton", () => {
	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	it("renders with role=status", () => {
		render(<ChartSkeleton />);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has aria-busy=true", () => {
		render(<ChartSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("has default aria-label", () => {
		render(<ChartSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement du graphique");
	});

	it("accepts a custom aria-label", () => {
		render(<ChartSkeleton ariaLabel="Chargement revenus" />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement revenus");
	});

	// -------------------------------------------------------------------------
	// Structure
	// -------------------------------------------------------------------------

	it("renders a Card", () => {
		render(<ChartSkeleton />);

		expect(screen.getByTestId("card")).toBeInTheDocument();
	});

	it("renders skeleton placeholders for title and description", () => {
		render(<ChartSkeleton />);

		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders a chart area skeleton", () => {
		render(<ChartSkeleton />);

		// The main chart area has absolute positioning and covers most of the area
		const skeletons = screen.getAllByTestId("skeleton");
		// At minimum: title, description, Y-axis labels (4), chart area, X-axis labels (4)
		expect(skeletons.length).toBeGreaterThanOrEqual(6);
	});

	// -------------------------------------------------------------------------
	// height prop
	// -------------------------------------------------------------------------

	it("applies the default height of 250px to the chart container", () => {
		const { container } = render(<ChartSkeleton />);

		const chartContainer = container.querySelector("[style*='height: 250px']");
		expect(chartContainer).toBeInTheDocument();
	});

	it("applies a custom height to the chart container", () => {
		const { container } = render(<ChartSkeleton height={350} />);

		const chartContainer = container.querySelector("[style*='height: 350px']");
		expect(chartContainer).toBeInTheDocument();
	});
});
