import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetKpisReturn, GetReviewHealthReturn } from "../../types/dashboard.types";

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
			evolution: 12.5,
			previousVolume: 50,
		},
		monthlyOrders: { count: 25, evolution: -3.2, previousVolume: 50 },
		averageOrderValue: { amount: 200, evolution: 0, previousVolume: 50 },
		conversionRate: { rate: 65.0, evolution: 2.1, abandoned: 8, previousVolume: 50 },
		pendingShipment: { count: 3 },
		discountImpact: { amount: 150, evolution: 10.0, previousVolume: 50 },
		avgFulfillmentTime: { hours: 24, evolution: 0, previousVolume: 50 },
		...overrides,
	};
}

const defaultReviewHealth: GetReviewHealthReturn = {
	averageRating: 4.5,
	totalReviews: 10,
};

describe("DashboardKpis", () => {
	it("renders 7 KPI cards (4 featured + 3 compact)", () => {
		render(<DashboardKpis kpis={makeKpis()} reviewHealth={defaultReviewHealth} />);

		expect(screen.getAllByTestId("kpi-card")).toHaveLength(7);
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
						evolution: 15.0,
						previousVolume: 50,
					},
				})}
				reviewHealth={defaultReviewHealth}
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
						evolution: 0,
						previousVolume: 50,
					},
				})}
				reviewHealth={defaultReviewHealth}
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
						evolution: 10,
						previousVolume: 50,
					},
				})}
				reviewHealth={defaultReviewHealth}
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
		render(
			<DashboardKpis
				kpis={makeKpis({ monthlyOrders: { count: 42, evolution: 8.3, previousVolume: 50 } })}
				reviewHealth={defaultReviewHealth}
			/>,
		);

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
			<DashboardKpis
				kpis={makeKpis({
					averageOrderValue: { amount: 175.5, evolution: -2.1, previousVolume: 50 },
				})}
				reviewHealth={defaultReviewHealth}
			/>,
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

	it("renders À expédier KPI with warning when count > 0", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({ pendingShipment: { count: 5 } })}
				reviewHealth={defaultReviewHealth}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "À expédier",
				numericValue: 5,
				priority: "alert",
				status: "warning",
				href: "/admin/ventes/commandes?filter_fulfillmentStatus=UNFULFILLED",
			}),
		);
	});

	it("renders À expédier KPI with info priority when count is 0", () => {
		render(
			<DashboardKpis
				kpis={makeKpis({ pendingShipment: { count: 0 } })}
				reviewHealth={defaultReviewHealth}
			/>,
		);

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
					conversionRate: { rate: 72.5, evolution: 5.0, abandoned: 12, previousVolume: 50 },
				})}
				reviewHealth={defaultReviewHealth}
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
					conversionRate: { rate: 72.5, evolution: 5.0, abandoned: 12, previousVolume: 50 },
				})}
				reviewHealth={defaultReviewHealth}
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
					conversionRate: { rate: 90.0, evolution: 0, abandoned: 1, previousVolume: 50 },
				})}
				reviewHealth={defaultReviewHealth}
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
					conversionRate: { rate: 100, evolution: 0, abandoned: 0, previousVolume: 50 },
				})}
				reviewHealth={defaultReviewHealth}
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
						evolution: 10,
						previousVolume: 50,
					},
				})}
				reviewHealth={defaultReviewHealth}
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
						evolution: 10,
						previousVolume: 50,
					},
				})}
				reviewHealth={defaultReviewHealth}
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
						evolution: 10,
						previousVolume: 50,
					},
					discountImpact: { amount: 200, evolution: 5, previousVolume: 50 },
				})}
				reviewHealth={defaultReviewHealth}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "CA net du mois",
				subtitle: expect.stringContaining("remises"),
			}),
		);
	});

	it("renders Note moyenne KPI from reviewHealth prop", () => {
		render(
			<DashboardKpis kpis={makeKpis()} reviewHealth={{ averageRating: 4.8, totalReviews: 42 }} />,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Note moyenne",
				numericValue: 4.8,
				subtitle: "42 avis",
				href: "/admin/marketing/avis",
			}),
		);
	});

	it("renders Note moyenne with em-dash and 'Aucun avis' when no reviews", () => {
		render(
			<DashboardKpis kpis={makeKpis()} reviewHealth={{ averageRating: 0, totalReviews: 0 }} />,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Note moyenne",
				value: "—",
				subtitle: "Aucun avis",
			}),
		);
	});

	it("renders compact KPIs in a 3-column grid on lg+", () => {
		const { container } = render(
			<DashboardKpis kpis={makeKpis()} reviewHealth={defaultReviewHealth} />,
		);

		const grids = container.querySelectorAll(".grid");
		expect(grids[0]).toHaveClass("lg:grid-cols-3");
	});

	it("passes tooltip to each KPI card", () => {
		render(<DashboardKpis kpis={makeKpis()} reviewHealth={defaultReviewHealth} />);

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
				refundRate: 0,
				evolution: 0,
				previousVolume: 0,
			},
			monthlyOrders: { count: 0, evolution: 0, previousVolume: 0 },
			averageOrderValue: { amount: 0, evolution: 0, previousVolume: 0 },
			conversionRate: { rate: 0, evolution: 0, abandoned: 0, previousVolume: 0 },
			pendingShipment: { count: 0 },
			discountImpact: { amount: 0, evolution: 0, previousVolume: 0 },
			avgFulfillmentTime: { hours: 0, evolution: 0, previousVolume: 0 },
		};

		render(<DashboardKpis kpis={kpis} reviewHealth={{ averageRating: 0, totalReviews: 0 }} />);

		expect(screen.getAllByTestId("kpi-card")).toHaveLength(7);
	});
});
