import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
	CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-header" className={className}>
			{children}
		</div>
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
		spacing: {
			kpiGap: "gap-4",
		},
	},
}));

import { KpisSkeleton, KpiCardSkeleton } from "../skeletons/kpis-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("KpiCardSkeleton", () => {
	it("renders a card", () => {
		render(<KpiCardSkeleton />);

		expect(screen.getAllByTestId("card")).toHaveLength(1);
	});

	it("renders skeleton placeholders for title and icon", () => {
		render(<KpiCardSkeleton />);

		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("renders skeleton for the large value", () => {
		render(<KpiCardSkeleton />);

		const skeletons = screen.getAllByTestId("skeleton");
		const hasValueSkeleton = skeletons.some((s) => s.className.includes("h-10"));
		expect(hasValueSkeleton).toBe(true);
	});
});

describe("KpisSkeleton", () => {
	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	it("renders with role=status", () => {
		render(<KpisSkeleton />);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has aria-busy=true", () => {
		render(<KpisSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("has default aria-label", () => {
		render(<KpisSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement des indicateurs");
	});

	it("accepts a custom aria-label", () => {
		render(<KpisSkeleton ariaLabel="Chargement KPIs" />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement KPIs");
	});

	// -------------------------------------------------------------------------
	// count prop
	// -------------------------------------------------------------------------

	it("renders 4 KPI cards by default", () => {
		render(<KpisSkeleton />);

		expect(screen.getAllByTestId("card").length).toBeGreaterThanOrEqual(4);
	});

	it("renders 2 KPI cards when count=2", () => {
		render(<KpisSkeleton count={2} />);

		// 2 featured cards, 0 compact cards
		expect(screen.getAllByTestId("card")).toHaveLength(2);
	});

	it("renders 3 KPI cards when count=3", () => {
		render(<KpisSkeleton count={3} />);

		expect(screen.getAllByTestId("card")).toHaveLength(3);
	});

	it("renders 6 KPI cards when count=6", () => {
		render(<KpisSkeleton count={6} />);

		expect(screen.getAllByTestId("card")).toHaveLength(6);
	});

	// -------------------------------------------------------------------------
	// compactCount prop
	// -------------------------------------------------------------------------

	it("renders no compact cards by default", () => {
		render(<KpisSkeleton count={2} />);

		// Only 2 featured cards
		expect(screen.getAllByTestId("card")).toHaveLength(2);
	});

	it("renders additional compact cards when compactCount is set", () => {
		render(<KpisSkeleton count={4} compactCount={3} />);

		// 4 featured + 3 compact = 7 total cards
		expect(screen.getAllByTestId("card")).toHaveLength(7);
	});
});
