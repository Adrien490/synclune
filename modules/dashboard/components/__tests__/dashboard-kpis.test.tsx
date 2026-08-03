import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetKpisReturn } from "../../types/dashboard.types";

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (amount: number) => `${amount.toFixed(2)} €`,
}));

vi.mock("lucide-react", () => ({
	Euro: () => <span data-testid="icon-euro" />,
	ShoppingBag: () => <span data-testid="icon-shopping-bag" />,
	Receipt: () => <span data-testid="icon-receipt" />,
	Package: () => <span data-testid="icon-package" />,
	Target: () => <span data-testid="icon-target" />,
	Star: () => <span data-testid="icon-star" />,
	Mail: () => <span data-testid="icon-mail" />,
	Clock: () => <span data-testid="icon-clock" />,
	UserPlus: () => <span data-testid="icon-user-plus" />,
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

function makeKpis(overrides: Partial<GetKpisReturn> = {}): GetKpisReturn {
	return {
		monthlyRevenue: {
			amount: 5000,
			netAmount: 4800,
			refundAmount: 200,
			refundCount: 1,
			refundRate: 4,
		},
		monthlyOrders: { count: 25 },
		averageOrderValue: { amount: 200 },
		conversionRate: { rate: 65.0, abandoned: 8 },
		pendingShipment: { count: 3 },
		discountImpact: { amount: 150 },
		newCustomers: { count: 12 },
		...overrides,
	};
}

describe("DashboardKpis", () => {
	// Lot 4 S3.5 : 6 cartes (4 featured + 2 compactes) — le délai d'expédition
	// est parti avec les évolutions et les sparklines.
	it("renders 6 KPI cards (4 featured + 2 compact)", () => {
		render(<DashboardKpis kpis={makeKpis()} />);

		expect(screen.getAllByTestId("kpi-card")).toHaveLength(6);
	});

	it("renders CA net du mois KPI with critical priority when refundRate < 10%", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					monthlyRevenue: {
						amount: 7500,
						netAmount: 7200,
						refundAmount: 300,
						refundCount: 2,
						refundRate: 4,
					},
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "CA net du mois",
				numericValue: 7200,
				suffix: " €",
				size: "featured",
				priority: "critical",
			}),
		);
	});

	it("downgrades CA net priority to alert when refundRate >= 10%", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					monthlyRevenue: {
						amount: 5000,
						netAmount: 4500,
						refundAmount: 500,
						refundCount: 5,
						refundRate: 25,
					},
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "CA net du mois",
				priority: "alert",
			}),
		);
	});

	it("includes refundRate (formatted) in revenue subtitle when refunds exist", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					monthlyRevenue: {
						amount: 5000,
						netAmount: 4700,
						refundAmount: 300,
						refundCount: 2,
						refundRate: 8,
					},
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "CA net du mois",
				subtitle: expect.stringContaining("8.0%"),
			}),
		);
	});

	it("renders Commandes KPI with correct props", () => {
		render(<DashboardKpis kpis={makeKpis({ monthlyOrders: { count: 42 } })} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Commandes",
				numericValue: 42,
				size: "featured",
				priority: "critical",
			}),
		);
	});

	it("renders Panier moyen KPI with correct props", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					averageOrderValue: { amount: 175.5 },
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Panier moyen",
				numericValue: 175.5,
				suffix: " €",
				size: "featured",
				priority: "operational",
			}),
		);
	});

	it("renders À expédier KPI with warning when count > 0", () => {
		render(<DashboardKpis kpis={makeKpis({ pendingShipment: { count: 5 } })} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "À expédier",
				numericValue: 5,
				priority: "alert",
				status: "warning",
			}),
		);
	});

	it("renders À expédier KPI with info priority when count is 0", () => {
		render(<DashboardKpis kpis={makeKpis({ pendingShipment: { count: 0 } })} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "À expédier",
				numericValue: 0,
				priority: "info",
				status: "default",
			}),
		);
	});

	it("renders Finalisation panier KPI as compact", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					conversionRate: { rate: 72.5, abandoned: 12 },
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Finalisation panier",
				numericValue: 72.5,
				suffix: " %",
				decimalPlaces: 1,
				size: "compact",
				priority: "operational",
				subtitle: "12 checkouts abandonnés",
			}),
		);
	});

	it("uses tooltip clarifying paniers vs visiteurs", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					conversionRate: { rate: 72.5, abandoned: 12 },
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Finalisation panier",
				tooltip: expect.stringContaining("paniers créés"),
			}),
		);
	});

	it("renders singular checkout abandoned text for 1", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					conversionRate: { rate: 90.0, abandoned: 1 },
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Finalisation panier",
				subtitle: "1 checkout abandonné",
			}),
		);
	});

	it("does not show abandoned subtitle when abandoned is 0", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({
					conversionRate: { rate: 100, abandoned: 0 },
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Finalisation panier",
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
						refundRate: 8,
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
						refundRate: 0,
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
						refundRate: 4,
					},
					discountImpact: { amount: 200 },
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

	it("renders compact KPIs in a 4-column grid on lg+", () => {
		const { container } = render(<DashboardKpis kpis={makeKpis()} />);

		const grids = container.querySelectorAll(".grid");
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

	it("renders a 'Nouveaux clients' KPI card from newCustomers", () => {
		render(<DashboardKpis kpis={makeKpis({ newCustomers: { count: 7 } })} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Nouveaux clients", value: "7" }),
		);
	});

	it("handles zero values without crashing", () => {
		const kpis: GetKpisReturn = {
			monthlyRevenue: {
				amount: 0,
				netAmount: 0,
				refundAmount: 0,
				refundCount: 0,
				refundRate: 0,
			},
			monthlyOrders: { count: 0 },
			averageOrderValue: { amount: 0 },
			conversionRate: { rate: 0, abandoned: 0 },
			pendingShipment: { count: 0 },
			discountImpact: { amount: 0 },
			newCustomers: { count: 0 },
		};

		render(<DashboardKpis kpis={kpis} />);

		expect(screen.getAllByTestId("kpi-card")).toHaveLength(6);
	});
});
