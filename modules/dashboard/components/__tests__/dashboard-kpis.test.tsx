import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetKpisReturn } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (amount: number) => `${amount.toFixed(2)} €`,
}));

vi.mock("lucide-react", () => ({
	Euro: () => <span data-testid="icon-euro" />,
	ShoppingBag: () => <span data-testid="icon-shopping-bag" />,
	Receipt: () => <span data-testid="icon-receipt" />,
	Package: () => <span data-testid="icon-package" />,
	Target: () => <span data-testid="icon-target" />,
}));

const mockKpiCard = vi.fn();
vi.mock("../kpi-card", () => ({
	KpiCard: (props: Record<string, unknown>) => {
		mockKpiCard(props);
		return <div data-testid="kpi-card" data-title={props.title} />;
	},
}));

import { DashboardKpis } from "../dashboard-kpis";

afterEach(() => {
	cleanup();
	mockKpiCard.mockClear();
});

// ============================================================================
// HELPERS
// ============================================================================

function makeKpis(overrides: Partial<GetKpisReturn> = {}): GetKpisReturn {
	return {
		monthlyRevenue: {
			amount: 5000,
			netAmount: 4800,
			refundAmount: 200,
			refundCount: 1,
			evolution: 12.5,
		},
		monthlyOrders: { count: 25, evolution: -3.2 },
		averageOrderValue: { amount: 200, evolution: 0 },
		conversionRate: { rate: 65.0, evolution: 2.1, abandoned: 8 },
		pendingShipment: { count: 3 },
		discountImpact: { amount: 150, evolution: 10.0 },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardKpis", () => {
	it("renders 5 KPI cards (4 featured + 1 compact)", () => {
		render(<DashboardKpis kpis={makeKpis()} />);

		expect(screen.getAllByTestId("kpi-card")).toHaveLength(5);
	});

	it("renders CA net du mois KPI with correct props", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					monthlyRevenue: {
						amount: 7500,
						netAmount: 7200,
						refundAmount: 300,
						refundCount: 2,
						evolution: 15.0,
					},
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "CA net du mois",
				numericValue: 7200,
				suffix: " €",
				evolution: 15.0,
				comparisonLabel: "vs mois dernier",
				size: "featured",
				priority: "critical",
				href: "/admin/ventes/commandes?paymentStatus=PAID",
			}),
		);
	});

	it("renders Commandes KPI with correct props", () => {
		render(<DashboardKpis kpis={makeKpis({ monthlyOrders: { count: 42, evolution: 8.3 } })} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Commandes",
				numericValue: 42,
				evolution: 8.3,
				comparisonLabel: "vs mois dernier",
				size: "featured",
				priority: "critical",
				href: "/admin/ventes/commandes",
			}),
		);
	});

	it("renders Panier moyen KPI with correct props", () => {
		render(
			<DashboardKpis kpis={makeKpis({ averageOrderValue: { amount: 175.5, evolution: -2.1 } })} />,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Panier moyen",
				numericValue: 175.5,
				suffix: " €",
				evolution: -2.1,
				comparisonLabel: "vs mois dernier",
				size: "featured",
				priority: "operational",
			}),
		);
	});

	it("renders A expedier KPI with warning when count > 0", () => {
		render(<DashboardKpis kpis={makeKpis({ pendingShipment: { count: 5 } })} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "A expedier",
				numericValue: 5,
				priority: "alert",
				status: "warning",
				href: "/admin/ventes/commandes?filter_fulfillmentStatus=UNFULFILLED",
			}),
		);
	});

	it("renders A expedier KPI with info priority when count is 0", () => {
		render(<DashboardKpis kpis={makeKpis({ pendingShipment: { count: 0 } })} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "A expedier",
				numericValue: 0,
				priority: "info",
				status: "default",
			}),
		);
	});

	it("renders Taux de conversion KPI as compact", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({ conversionRate: { rate: 72.5, evolution: 5.0, abandoned: 12 } })}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Taux de conversion",
				numericValue: 72.5,
				suffix: " %",
				decimalPlaces: 1,
				size: "compact",
				priority: "operational",
				subtitle: "12 checkouts abandonnes",
			}),
		);
	});

	it("renders singular checkout abandoned text for 1", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({ conversionRate: { rate: 90.0, evolution: 0, abandoned: 1 } })}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Taux de conversion",
				subtitle: "1 checkout abandonne",
			}),
		);
	});

	it("does not show abandoned subtitle when abandoned is 0", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({ conversionRate: { rate: 100, evolution: 0, abandoned: 0 } })}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Taux de conversion",
				subtitle: undefined,
			}),
		);
	});

	it("shows refund badge when refunds exist", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					monthlyRevenue: {
						amount: 5000,
						netAmount: 4700,
						refundAmount: 300,
						refundCount: 2,
						evolution: 10,
					},
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "CA net du mois",
				badge: { label: "2 remb.", variant: "destructive" },
			}),
		);
	});

	it("does not show refund badge when no refunds", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					monthlyRevenue: {
						amount: 5000,
						netAmount: 5000,
						refundAmount: 0,
						refundCount: 0,
						evolution: 10,
					},
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "CA net du mois",
				badge: undefined,
			}),
		);
	});

	it("shows discount and refund info in revenue subtitle", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					monthlyRevenue: {
						amount: 5000,
						netAmount: 4700,
						refundAmount: 150,
						refundCount: 1,
						evolution: 10,
					},
					discountImpact: { amount: 200, evolution: 5 },
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "CA net du mois",
				subtitle: expect.stringContaining("remises"),
			}),
		);
	});

	it("renders featured KPIs in a 4-column grid on lg+", () => {
		const { container } = render(<DashboardKpis kpis={makeKpis()} />);

		const grids = container.querySelectorAll(".grid");
		// First grid: 4 featured KPIs
		expect(grids[0]).toHaveClass("lg:grid-cols-4");
	});

	it("passes tooltip to each KPI card", () => {
		render(<DashboardKpis kpis={makeKpis()} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "CA net du mois",
				tooltip: expect.stringContaining("net"),
			}),
		);
	});

	it("handles zero values without crashing", () => {
		const kpis: GetKpisReturn = {
			monthlyRevenue: {
				amount: 0,
				netAmount: 0,
				refundAmount: 0,
				refundCount: 0,
				evolution: 0,
			},
			monthlyOrders: { count: 0, evolution: 0 },
			averageOrderValue: { amount: 0, evolution: 0 },
			conversionRate: { rate: 0, evolution: 0, abandoned: 0 },
			pendingShipment: { count: 0 },
			discountImpact: { amount: 0, evolution: 0 },
		};

		render(<DashboardKpis kpis={kpis} />);

		expect(screen.getAllByTestId("kpi-card")).toHaveLength(5);
	});
});
