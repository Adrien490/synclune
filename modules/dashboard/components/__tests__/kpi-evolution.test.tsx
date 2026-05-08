import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	ArrowUp: () => <svg data-testid="arrow-up" aria-hidden="true" />,
	ArrowDown: () => <svg data-testid="arrow-down" aria-hidden="true" />,
	Info: () => <svg data-testid="info-icon" aria-hidden="true" />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
		<span data-testid="badge" {...props}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		evolution: {
			positive: "text-emerald-600",
			negative: "text-rose-600",
		},
	},
}));

vi.mock("../../constants/dashboard.constants", () => ({
	LOW_VOLUME_THRESHOLD: 10,
}));

import { KpiEvolution } from "../kpi-evolution";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("KpiEvolution", () => {
	it("renders positive evolution with up arrow", () => {
		render(<KpiEvolution evolution={12.5} />);

		expect(screen.getByTestId("arrow-up")).toBeInTheDocument();
		expect(screen.queryByTestId("arrow-down")).toBeNull();
	});

	it("renders negative evolution with down arrow", () => {
		render(<KpiEvolution evolution={-8.3} />);

		expect(screen.getByTestId("arrow-down")).toBeInTheDocument();
		expect(screen.queryByTestId("arrow-up")).toBeNull();
	});

	it("treats zero as positive", () => {
		render(<KpiEvolution evolution={0} />);

		expect(screen.getByTestId("arrow-up")).toBeInTheDocument();
	});

	it("displays formatted percentage with 1 decimal", () => {
		render(<KpiEvolution evolution={12.567} />);

		expect(screen.getByText("12.6%")).toBeInTheDocument();
	});

	it("displays absolute value for negative evolution", () => {
		render(<KpiEvolution evolution={-5.2} />);

		expect(screen.getByText("5.2%")).toBeInTheDocument();
	});

	it("renders comparison label when provided", () => {
		render(<KpiEvolution evolution={10} comparisonLabel="vs mois dernier" />);

		expect(screen.getByText("vs mois dernier")).toBeInTheDocument();
	});

	it("does not render comparison label when not provided", () => {
		render(<KpiEvolution evolution={10} />);

		expect(screen.queryByText("vs mois dernier")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	describe("accessibility", () => {
		it("sets aria-label for positive evolution", () => {
			render(<KpiEvolution evolution={12.5} />);

			const element = screen.getByLabelText("En hausse de 12.5 pourcent");
			expect(element).toBeInTheDocument();
		});

		it("sets aria-label for negative evolution", () => {
			render(<KpiEvolution evolution={-8.3} />);

			const element = screen.getByLabelText("En baisse de 8.3 pourcent");
			expect(element).toBeInTheDocument();
		});
	});

	// -------------------------------------------------------------------------
	// Low-volume gating (P1.4)
	// -------------------------------------------------------------------------

	describe("low-volume gating", () => {
		it("renders 'Données limitées' badge when previousVolume < 10", () => {
			render(<KpiEvolution evolution={42.5} previousVolume={5} />);

			expect(screen.getByText("Données limitées")).toBeInTheDocument();
			expect(screen.queryByText("42.5%")).toBeNull();
			expect(screen.queryByTestId("arrow-up")).toBeNull();
			expect(screen.queryByTestId("arrow-down")).toBeNull();
		});

		it("renders normal % when previousVolume >= 10", () => {
			render(<KpiEvolution evolution={12.5} previousVolume={10} />);

			expect(screen.getByText("12.5%")).toBeInTheDocument();
			expect(screen.queryByText("Données limitées")).toBeNull();
		});

		it("renders normal % when previousVolume is undefined (backward compat)", () => {
			render(<KpiEvolution evolution={12.5} />);

			expect(screen.getByText("12.5%")).toBeInTheDocument();
			expect(screen.queryByText("Données limitées")).toBeNull();
		});

		it("hides comparisonLabel when in low-volume mode", () => {
			render(
				<KpiEvolution evolution={42.5} previousVolume={5} comparisonLabel="vs mois dernier" />,
			);

			expect(screen.queryByText("vs mois dernier")).toBeNull();
		});

		it("sets aria-label 'Comparaison non significative' on the badge", () => {
			render(<KpiEvolution evolution={42.5} previousVolume={3} />);

			expect(
				screen.getByLabelText("Comparaison non significative — données insuffisantes"),
			).toBeInTheDocument();
		});

		it("includes the previous volume in the tooltip with correct plural", () => {
			render(<KpiEvolution evolution={42.5} previousVolume={1} />);

			const tooltip = screen.getByTestId("tooltip-content");
			expect(tooltip.textContent).toContain("1 commande");
			expect(tooltip.textContent).not.toContain("commandes");
		});

		it("includes the previous volume in the tooltip with plural for >1", () => {
			render(<KpiEvolution evolution={42.5} previousVolume={5} />);

			const tooltip = screen.getByTestId("tooltip-content");
			expect(tooltip.textContent).toContain("5 commandes");
		});

		it("treats previousVolume = 0 as low-volume (boundary)", () => {
			render(<KpiEvolution evolution={42.5} previousVolume={0} />);

			expect(screen.getByText("Données limitées")).toBeInTheDocument();
		});
	});
});
