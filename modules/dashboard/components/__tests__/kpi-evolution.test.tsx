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
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		evolution: {
			positive: "text-emerald-600",
			negative: "text-rose-600",
		},
	},
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
});
