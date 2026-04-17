import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetSalesHeatmapReturn, HeatmapCell } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (amount: number) => `${amount.toFixed(2)} €`,
}));

vi.mock("lucide-react", () => ({
	Activity: () => <span data-testid="icon-activity" />,
}));

import { SalesHeatmap } from "../sales-heatmap";

afterEach(() => {
	cleanup();
});

// ============================================================================
// HELPERS
// ============================================================================

function makeCells(
	populate: Array<{ dayOfWeek: number; hour: number; count: number; revenue: number }> = [],
): HeatmapCell[] {
	const cells: HeatmapCell[] = [];
	for (let day = 0; day < 7; day++) {
		for (let hour = 0; hour < 24; hour++) {
			const found = populate.find((c) => c.dayOfWeek === day && c.hour === hour);
			cells.push(found ?? { dayOfWeek: day, hour, count: 0, revenue: 0 });
		}
	}
	return cells;
}

function makeData(overrides: Partial<GetSalesHeatmapReturn> = {}): GetSalesHeatmapReturn {
	const cells = makeCells([
		{ dayOfWeek: 1, hour: 14, count: 5, revenue: 15000 },
		{ dayOfWeek: 5, hour: 20, count: 3, revenue: 8500 },
	]);
	return {
		cells,
		maxCount: 5,
		totalOrders: 8,
		totalRevenue: 23500,
		periodLabel: "Ce mois",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("SalesHeatmap", () => {
	it("renders the title", () => {
		render(<SalesHeatmap data={makeData()} />);

		expect(screen.getByText("Activité par jour & heure")).toBeInTheDocument();
	});

	it("renders summary description with total orders and revenue", () => {
		render(<SalesHeatmap data={makeData()} />);

		expect(screen.getByText(/8 commandes/)).toBeInTheDocument();
		expect(screen.getByText(/23500.00 €/)).toBeInTheDocument();
		expect(screen.getByText(/ce mois/)).toBeInTheDocument();
	});

	it("renders empty state when totalOrders is 0", () => {
		const empty = makeData({
			cells: makeCells([]),
			maxCount: 0,
			totalOrders: 0,
			totalRevenue: 0,
		});

		render(<SalesHeatmap data={empty} />);

		expect(screen.getByText("Pas assez de données pour afficher la heatmap")).toBeInTheDocument();
		expect(screen.getByText(/Aucune commande sur la période/)).toBeInTheDocument();
	});

	it("renders 168 cells (7 days × 24 hours)", () => {
		render(<SalesHeatmap data={makeData()} />);

		const cells = screen.getAllByRole("img");
		expect(cells).toHaveLength(168);
	});

	it("includes day labels (Dim, Lun, ..., Sam)", () => {
		render(<SalesHeatmap data={makeData()} />);

		expect(screen.getByText("Dim")).toBeInTheDocument();
		expect(screen.getByText("Lun")).toBeInTheDocument();
		expect(screen.getByText("Mar")).toBeInTheDocument();
		expect(screen.getByText("Mer")).toBeInTheDocument();
		expect(screen.getByText("Jeu")).toBeInTheDocument();
		expect(screen.getByText("Ven")).toBeInTheDocument();
		expect(screen.getByText("Sam")).toBeInTheDocument();
	});

	it("renders cell tooltip with count and revenue when populated", () => {
		render(<SalesHeatmap data={makeData()} />);

		expect(screen.getByLabelText(/lundi 14h — 5 commandes/)).toBeInTheDocument();
	});

	it("renders cell tooltip 'aucune commande' when count is 0", () => {
		render(<SalesHeatmap data={makeData()} />);

		expect(screen.getByLabelText("dimanche 0h — aucune commande")).toBeInTheDocument();
	});

	it("renders peak indicator with maxCount", () => {
		render(<SalesHeatmap data={makeData()} />);

		expect(screen.getByText(/Pic : 5 commandes\/h/)).toBeInTheDocument();
	});

	it("renders singular 'commande' for maxCount of 1", () => {
		const data = makeData({
			cells: makeCells([{ dayOfWeek: 0, hour: 0, count: 1, revenue: 100 }]),
			maxCount: 1,
			totalOrders: 1,
			totalRevenue: 100,
		});

		render(<SalesHeatmap data={data} />);

		expect(screen.getByText(/Pic : 1 commande\/h/)).toBeInTheDocument();
	});

	it("renders legend (Moins / Plus)", () => {
		render(<SalesHeatmap data={makeData()} />);

		expect(screen.getByText("Moins")).toBeInTheDocument();
		expect(screen.getByText("Plus")).toBeInTheDocument();
	});

	it("renders hour ticks for 0h, 6h, 12h, 18h", () => {
		render(<SalesHeatmap data={makeData()} />);

		expect(screen.getByText("0h")).toBeInTheDocument();
		expect(screen.getByText("6h")).toBeInTheDocument();
		expect(screen.getByText("12h")).toBeInTheDocument();
		expect(screen.getByText("18h")).toBeInTheDocument();
	});
});
