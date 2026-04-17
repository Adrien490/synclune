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
	X: () => <span data-testid="icon-x" />,
}));

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

import { SalesHeatmap } from "../sales-heatmap";

afterEach(() => {
	cleanup();
	mockHaptic.mockClear();
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

		const cells = screen.getAllByRole("gridcell");
		expect(cells).toHaveLength(168);
	});

	it("wraps cells in an ARIA grid with aria-label", () => {
		render(<SalesHeatmap data={makeData()} />);

		const grid = screen.getByRole("grid", { name: /activité par jour et heure/i });
		expect(grid).toHaveAttribute("aria-rowcount", "7");
		expect(grid).toHaveAttribute("aria-colcount", "24");
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

	// -------------------------------------------------------------------------
	// Tap-to-reveal (native 2026 mobile pattern)
	// -------------------------------------------------------------------------

	it("exposes an sr-only live region for the selected cell detail panel", () => {
		render(<SalesHeatmap data={makeData()} />);
		const panel = screen.getByTestId("heatmap-selected-cell");
		expect(panel).toHaveAttribute("role", "status");
		expect(panel).toHaveAttribute("aria-live", "polite");
	});

	it("makes populated cells focusable and non-populated cells non-focusable", () => {
		render(<SalesHeatmap data={makeData()} />);
		const populatedCell = screen.getByLabelText(/lundi 14h — 5 commandes/);
		const emptyCell = screen.getByLabelText("dimanche 0h — aucune commande");
		expect(populatedCell).toHaveAttribute("tabindex", "0");
		expect(emptyCell).toHaveAttribute("tabindex", "-1");
	});

	it("fires a 'selection' haptic and reveals details when a populated cell is tapped", async () => {
		const { fireEvent } = await import("@testing-library/react");
		render(<SalesHeatmap data={makeData()} />);

		const cell = screen.getByLabelText(/lundi 14h — 5 commandes/);
		fireEvent.click(cell);

		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(screen.getByTestId("heatmap-selected-cell")).toHaveTextContent(/lundi 14h/i);
		expect(screen.getByTestId("heatmap-selected-cell")).toHaveTextContent(/5 commandes/);
	});

	it("does not react to taps on empty cells", async () => {
		const { fireEvent } = await import("@testing-library/react");
		render(<SalesHeatmap data={makeData()} />);

		const emptyCell = screen.getByLabelText("dimanche 0h — aucune commande");
		fireEvent.click(emptyCell);

		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("allows keyboard activation (Enter / Space)", async () => {
		const { fireEvent } = await import("@testing-library/react");
		render(<SalesHeatmap data={makeData()} />);

		const cell = screen.getByLabelText(/lundi 14h — 5 commandes/);
		fireEvent.keyDown(cell, { key: "Enter" });

		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("toggles the panel off when the same cell is tapped twice", async () => {
		const { fireEvent } = await import("@testing-library/react");
		render(<SalesHeatmap data={makeData()} />);

		const cell = screen.getByLabelText(/lundi 14h — 5 commandes/);
		fireEvent.click(cell);
		expect(cell).toHaveAttribute("aria-selected", "true");

		fireEvent.click(cell);
		expect(cell).toHaveAttribute("aria-selected", "false");
	});
});
