import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetRevenueChartReturn } from "../../types/dashboard.types";

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
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<p className={className}>{children}</p>
	),
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h3 className={className}>{children}</h3>
	),
}));

vi.mock("@/modules/dashboard/components/chart", () => ({
	ChartContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="chart-container">{children}</div>
	),
	ChartLegend: () => <div data-testid="chart-legend" />,
	ChartLegendContent: () => null,
	ChartTooltip: () => <div data-testid="chart-tooltip" />,
	ChartTooltipContent: () => null,
}));

vi.mock("recharts", () => ({
	Area: () => <div data-testid="area" />,
	CartesianGrid: () => <div data-testid="cartesian-grid" />,
	ComposedChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
		<div data-testid="composed-chart" data-count={data.length}>
			{children}
		</div>
	),
	Line: () => <div data-testid="line" />,
	XAxis: () => <div data-testid="x-axis" />,
	YAxis: () => <div data-testid="y-axis" />,
}));

vi.mock("../chart-empty", () => ({
	ChartEmpty: ({ type, minHeight }: { type: string; minHeight?: number }) => (
		<div data-testid="chart-empty" data-type={type} style={{ minHeight }} />
	),
}));

vi.mock("../chart-scroll-container", () => ({
	ChartScrollContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="chart-scroll-container">{children}</div>
	),
}));

vi.mock("../../constants/chart-styles", () => ({
	CHART_STYLES: {
		card: "mock-card",
		title: "mock-title",
		description: "mock-description",
		height: { responsive: "mock-height" },
		touchTarget: { button: "mock-touch" },
	},
}));

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

import { RevenueChart } from "../revenue-chart";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function makeChartData(count = 5, baseRevenue = 100): GetRevenueChartReturn {
	return {
		data: Array.from({ length: count }, (_, i) => ({
			date: `${i + 1} janv.`,
			revenue: baseRevenue * (i + 1),
			orders: i + 1,
			subtotal: 0,
			discounts: 0,
			shipping: 0,
		})),
		periodLabel: "30 jours",
	};
}

function makeEmptyChartData(count = 5): GetRevenueChartReturn {
	return {
		data: Array.from({ length: count }, (_, i) => ({
			date: `${i + 1} janv.`,
			revenue: 0,
			orders: 0,
			subtotal: 0,
			discounts: 0,
			shipping: 0,
		})),
		periodLabel: "30 jours",
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("RevenueChart", () => {
	// -------------------------------------------------------------------------
	// Rendering with data
	// -------------------------------------------------------------------------

	it("renders the chart title", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		expect(screen.getByText("Revenus des 30 derniers jours")).toBeInTheDocument();
	});

	it("renders the chart description mentioning revenue and orders", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		expect(screen.getByText(/Chiffre d'affaires et nombre de commandes/)).toBeInTheDocument();
	});

	it("renders the ComposedChart when there is revenue data", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
	});

	it("renders both Area (revenue) and Line (orders) series", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		expect(screen.getByTestId("area")).toBeInTheDocument();
		expect(screen.getByTestId("line")).toBeInTheDocument();
	});

	it("passes data to the ComposedChart", () => {
		render(<RevenueChart chartData={makeChartData(3)} />);

		expect(screen.getByTestId("composed-chart")).toHaveAttribute("data-count", "3");
	});

	it("renders the chart inside a scroll container", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		expect(screen.getByTestId("chart-scroll-container")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Empty state
	// -------------------------------------------------------------------------

	it("renders ChartEmpty when all revenue values are 0", () => {
		render(<RevenueChart chartData={makeEmptyChartData()} />);

		expect(screen.getByTestId("chart-empty")).toBeInTheDocument();
		expect(screen.getByTestId("chart-empty")).toHaveAttribute("data-type", "noRevenue");
	});

	it("does not render ComposedChart when there is no revenue", () => {
		render(<RevenueChart chartData={makeEmptyChartData()} />);

		expect(screen.queryByTestId("composed-chart")).toBeNull();
	});

	it("renders chart when at least one day has revenue > 0", () => {
		const data = makeEmptyChartData(5);
		data.data[2]!.revenue = 100;

		render(<RevenueChart chartData={data} />);

		expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
		expect(screen.queryByTestId("chart-empty")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Accessibility: sr-only summary
	// -------------------------------------------------------------------------

	it("renders sr-only summary with total revenue", () => {
		const chartData = makeChartData(3, 100); // 100 + 200 + 300 = 600

		render(<RevenueChart chartData={chartData} />);

		expect(screen.getByText(/Total revenus sur la période : 600.00 €/)).toBeInTheDocument();
	});

	it("renders sr-only summary with total orders", () => {
		const chartData = makeChartData(3, 100); // orders: 1 + 2 + 3 = 6

		render(<RevenueChart chartData={chartData} />);

		expect(screen.getByText(/Total commandes sur la période : 6/)).toBeInTheDocument();
	});

	it("renders sr-only summary with peak revenue entry", () => {
		const chartData: GetRevenueChartReturn = {
			data: [
				{ date: "1 janv.", revenue: 50, orders: 1, subtotal: 0, discounts: 0, shipping: 0 },
				{ date: "2 janv.", revenue: 300, orders: 3, subtotal: 0, discounts: 0, shipping: 0 },
				{ date: "3 janv.", revenue: 100, orders: 2, subtotal: 0, discounts: 0, shipping: 0 },
			],
			periodLabel: "30 jours",
		};

		render(<RevenueChart chartData={chartData} />);

		expect(screen.getByText(/Pic revenus : 300.00 € le 2 janv./)).toBeInTheDocument();
	});

	it("renders sr-only summary with peak orders entry", () => {
		const chartData: GetRevenueChartReturn = {
			data: [
				{ date: "1 janv.", revenue: 50, orders: 1, subtotal: 0, discounts: 0, shipping: 0 },
				{ date: "2 janv.", revenue: 100, orders: 5, subtotal: 0, discounts: 0, shipping: 0 },
				{ date: "3 janv.", revenue: 200, orders: 2, subtotal: 0, discounts: 0, shipping: 0 },
			],
			periodLabel: "30 jours",
		};

		render(<RevenueChart chartData={chartData} />);

		expect(screen.getByText(/Pic commandes : 5 le 2 janv./)).toBeInTheDocument();
	});

	it("renders figure role with descriptive aria-label", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		const figure = screen.getByRole("figure");
		expect(figure).toHaveAttribute(
			"aria-label",
			"Graphique des revenus et commandes - Revenus des 30 derniers jours",
		);
	});

	it("renders dynamic aria-label when periodLabel is provided", () => {
		render(<RevenueChart chartData={makeChartData()} periodLabel="7 jours" />);

		const figure = screen.getByRole("figure");
		expect(figure).toHaveAttribute(
			"aria-label",
			"Graphique des revenus et commandes - Revenus - 7 jours",
		);
	});

	it("does not render figure when there is no revenue", () => {
		render(<RevenueChart chartData={makeEmptyChartData()} />);

		expect(screen.queryByRole("figure")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Edge cases
	// -------------------------------------------------------------------------

	it("handles empty data array without crashing", () => {
		render(<RevenueChart chartData={{ data: [], periodLabel: "" }} />);

		expect(screen.getByTestId("chart-empty")).toBeInTheDocument();
	});

	it("handles single data point", () => {
		render(
			<RevenueChart
				chartData={{
					data: [
						{ date: "1 janv.", revenue: 500, orders: 2, subtotal: 0, discounts: 0, shipping: 0 },
					],
					periodLabel: "7 jours",
				}}
			/>,
		);

		expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
		expect(screen.getByText(/Total revenus sur la période : 500.00 €/)).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Haptic feedback
	// -------------------------------------------------------------------------

	it("fires a 'selection' haptic when the Détailler toggle is tapped", async () => {
		const { fireEvent } = await import("@testing-library/react");
		const chartData: GetRevenueChartReturn = {
			data: [
				{
					date: "1 janv.",
					revenue: 500,
					orders: 2,
					subtotal: 400,
					discounts: 50,
					shipping: 10,
				},
			],
			periodLabel: "30 jours",
		};

		render(<RevenueChart chartData={chartData} />);
		fireEvent.click(screen.getByRole("button", { name: /détailler/i }));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("renders the mobile tap hint caption", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		expect(screen.getByText("Touchez le graphique pour voir le détail.")).toBeInTheDocument();
	});
});
