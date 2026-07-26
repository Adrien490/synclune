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
	Line: ({ dataKey }: { dataKey?: string }) => <div data-testid="line" data-key={dataKey} />,
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

const mockRouterPush = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		replace: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/admin",
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
		granularity: "daily",
		hasComparison: false,
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
		granularity: "daily",
		hasComparison: false,
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

		expect(screen.getByText("Revenus - 30 jours")).toBeInTheDocument();
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
		const chartData = makeChartData(3, 100); // 100 + 200 + 300 = 600 centimes

		render(<RevenueChart chartData={chartData} />);

		// revenue = centimes (SUM(Order.total)) → affiché en euros via formatEuro
		expect(screen.getByText(/Total revenus sur la période : 6,00/)).toBeInTheDocument();
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
			granularity: "daily",
			hasComparison: false,
		};

		render(<RevenueChart chartData={chartData} />);

		expect(screen.getByText(/Pic revenus : 3,00\s?€ le 2 janv./)).toBeInTheDocument();
	});

	it("renders sr-only summary with peak orders entry", () => {
		const chartData: GetRevenueChartReturn = {
			data: [
				{ date: "1 janv.", revenue: 50, orders: 1, subtotal: 0, discounts: 0, shipping: 0 },
				{ date: "2 janv.", revenue: 100, orders: 5, subtotal: 0, discounts: 0, shipping: 0 },
				{ date: "3 janv.", revenue: 200, orders: 2, subtotal: 0, discounts: 0, shipping: 0 },
			],
			periodLabel: "30 jours",
			granularity: "daily",
			hasComparison: false,
		};

		render(<RevenueChart chartData={chartData} />);

		expect(screen.getByText(/Pic commandes : 5 le 2 janv./)).toBeInTheDocument();
	});

	it("renders figure role labelled by the chart title and described by the sr-only summary", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		const figure = screen.getByRole("figure");
		expect(figure).toHaveAttribute("aria-labelledby", "revenue-chart-title");
		expect(figure).toHaveAttribute("aria-describedby", "revenue-chart-description");
	});

	it("links the sr-only description container by id", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		const description = document.getElementById("revenue-chart-description");
		expect(description).not.toBeNull();
		expect(description?.textContent).toContain("Total revenus");
	});

	it("does not render figure when there is no revenue", () => {
		render(<RevenueChart chartData={makeEmptyChartData()} />);

		expect(screen.queryByRole("figure")).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Edge cases
	// -------------------------------------------------------------------------

	it("handles empty data array without crashing", () => {
		render(
			<RevenueChart
				chartData={{ data: [], periodLabel: "", granularity: "daily", hasComparison: false }}
			/>,
		);

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
					granularity: "daily",
					hasComparison: false,
				}}
			/>,
		);

		expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
		expect(screen.getByText(/Total revenus sur la période : 5,00/)).toBeInTheDocument();
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
			granularity: "daily",
			hasComparison: false,
		};

		render(<RevenueChart chartData={chartData} />);
		fireEvent.click(screen.getByRole("button", { name: /détailler/i }));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("renders the mobile tap hint caption", () => {
		render(<RevenueChart chartData={makeChartData()} />);

		expect(screen.getByText("Touchez le graphique pour voir le détail.")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// URL-persisted chart mode toggle (F6)
	// -------------------------------------------------------------------------

	it("uses the chartMode prop to pick initial detailed view", () => {
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
			granularity: "daily",
			hasComparison: false,
		};
		render(<RevenueChart chartData={chartData} chartMode="detailed" />);
		expect(screen.getByRole("button", { name: /vue simple/i })).toBeInTheDocument();
	});

	it("pushes ?chartMode=detailed when toggling from simple", async () => {
		const { fireEvent } = await import("@testing-library/react");
		mockRouterPush.mockClear();
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
			granularity: "daily",
			hasComparison: false,
		};
		render(<RevenueChart chartData={chartData} chartMode="simple" />);
		fireEvent.click(screen.getByRole("button", { name: /détailler/i }));

		expect(mockRouterPush).toHaveBeenCalledWith("?chartMode=detailed", { scroll: false });
	});

	it("clears ?chartMode= when toggling back to simple (default)", async () => {
		const { fireEvent } = await import("@testing-library/react");
		mockRouterPush.mockClear();
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
			granularity: "daily",
			hasComparison: false,
		};
		render(<RevenueChart chartData={chartData} chartMode="detailed" />);
		fireEvent.click(screen.getByRole("button", { name: /vue simple/i }));

		expect(mockRouterPush).toHaveBeenCalledWith(".", { scroll: false });
	});

	it("exposes aria-pressed reflecting the current detailed state", () => {
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
			granularity: "daily",
			hasComparison: false,
		};
		render(<RevenueChart chartData={chartData} chartMode="detailed" />);
		expect(screen.getByRole("button", { name: /vue simple/i })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	// -------------------------------------------------------------------------
	// Comparison overlay (C4b)
	// -------------------------------------------------------------------------

	describe("comparison overlay", () => {
		function makeComparisonData(): GetRevenueChartReturn {
			return {
				data: [
					{
						date: "1 janv.",
						revenue: 500,
						orders: 2,
						subtotal: 0,
						discounts: 0,
						shipping: 0,
						previousRevenue: 300,
					},
					{
						date: "2 janv.",
						revenue: 800,
						orders: 3,
						subtotal: 0,
						discounts: 0,
						shipping: 0,
						previousRevenue: 600,
					},
				],
				periodLabel: "30 jours",
				granularity: "daily",
				hasComparison: true,
			};
		}

		it("renders the previousRevenue overlay line in simple mode when hasComparison", () => {
			render(<RevenueChart chartData={makeComparisonData()} chartMode="simple" />);

			const overlay = screen
				.getAllByTestId("line")
				.find((line) => line.getAttribute("data-key") === "previousRevenue");
			expect(overlay).toBeDefined();
		});

		it("does NOT render the overlay when hasComparison is false", () => {
			render(<RevenueChart chartData={makeChartData()} chartMode="simple" />);

			const overlay = screen
				.getAllByTestId("line")
				.find((line) => line.getAttribute("data-key") === "previousRevenue");
			expect(overlay).toBeUndefined();
		});

		it("does NOT render the overlay in detailed mode even with comparison data", () => {
			render(<RevenueChart chartData={makeComparisonData()} chartMode="detailed" />);

			const overlay = screen
				.getAllByTestId("line")
				.find((line) => line.getAttribute("data-key") === "previousRevenue");
			expect(overlay).toBeUndefined();
		});

		it("exposes the comparison total in the sr-only summary", () => {
			render(<RevenueChart chartData={makeComparisonData()} chartMode="simple" />);

			expect(
				screen.getByText(/Total revenus de la période de comparaison : 9,00/),
			).toBeInTheDocument();
		});
	});
});
