import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetCustomerKpisReturn } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (amount: number) => `${amount.toFixed(2)} €`,
}));

vi.mock("lucide-react", () => ({
	UserPlus: () => <span data-testid="icon-user-plus" />,
	Repeat: () => <span data-testid="icon-repeat" />,
	Crown: () => <span data-testid="icon-crown" />,
}));

const mockKpiCard = vi.fn();
vi.mock("../kpi-card", () => ({
	KpiCard: (props: Record<string, unknown>) => {
		mockKpiCard(props);
		return (
			<div data-testid="kpi-card" data-title={props.title as string}>
				<span data-testid="kpi-value">{props.value as string}</span>
				<span data-testid="kpi-subtitle">{(props.subtitle as string | undefined) ?? ""}</span>
			</div>
		);
	},
}));

import { CustomerKpis } from "../customer-kpis";

afterEach(() => {
	cleanup();
	mockKpiCard.mockClear();
});

// ============================================================================
// HELPERS
// ============================================================================

function makeKpis(overrides: Partial<GetCustomerKpisReturn> = {}): GetCustomerKpisReturn {
	return {
		newCustomers: { count: 12, evolution: 25 },
		returningRate: {
			rate: 40,
			returningCount: 4,
			totalActiveCustomers: 10,
			evolution: 10,
		},
		topSpender: {
			userId: "u1",
			customerName: "Alice Dupont",
			customerEmail: "alice@example.com",
			totalSpent: 1250,
			orderCount: 3,
		},
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("CustomerKpis", () => {
	it("renders 3 KPI cards", () => {
		render(<CustomerKpis kpis={makeKpis()} />);

		expect(screen.getAllByTestId("kpi-card")).toHaveLength(3);
	});

	it("renders new customers KPI with count and evolution", () => {
		render(<CustomerKpis kpis={makeKpis()} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Nouveaux clients",
				value: "12",
				numericValue: 12,
				evolution: 25,
				href: "/admin/clients",
			}),
		);
	});

	it("renders returning rate as percentage with subtitle counts", () => {
		render(<CustomerKpis kpis={makeKpis()} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Clients récurrents",
				value: "40.0 %",
				suffix: " %",
				evolution: 10,
				subtitle: "4 / 10 clients",
			}),
		);
	});

	it("renders dash and no evolution when no active customers", () => {
		render(
			<CustomerKpis
				kpis={makeKpis({
					returningRate: { rate: 0, returningCount: 0, totalActiveCustomers: 0, evolution: 0 },
				})}
			/>,
		);

		const returningCard = mockKpiCard.mock.calls.find((c) => c[0].title === "Clients récurrents");
		expect(returningCard?.[0].value).toBe("—");
		expect(returningCard?.[0].evolution).toBeUndefined();
		expect(returningCard?.[0].subtitle).toBeUndefined();
	});

	it("renders top spender with name, amount and order count subtitle", () => {
		render(<CustomerKpis kpis={makeKpis()} />);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Meilleur client",
				value: "1250.00 €",
				numericValue: 1250,
				subtitle: "Alice Dupont · 3 cmds",
				href: "/admin/clients?search=alice%40example.com",
			}),
		);
	});

	it("renders singular 'cmd' when top spender has 1 order", () => {
		render(
			<CustomerKpis
				kpis={makeKpis({
					topSpender: {
						userId: "u1",
						customerName: "Bob",
						customerEmail: "bob@x.com",
						totalSpent: 500,
						orderCount: 1,
					},
				})}
			/>,
		);

		expect(mockKpiCard).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Meilleur client",
				subtitle: "Bob · 1 cmd",
			}),
		);
	});

	it("renders empty state when no top spender", () => {
		render(<CustomerKpis kpis={makeKpis({ topSpender: null })} />);

		const topSpenderCard = mockKpiCard.mock.calls.find((c) => c[0].title === "Meilleur client");
		expect(topSpenderCard?.[0].value).toBe("—");
		expect(topSpenderCard?.[0].subtitle).toBe("Aucune commande");
		expect(topSpenderCard?.[0].href).toBeUndefined();
	});

	it("uses provided comparisonLabel", () => {
		render(<CustomerKpis kpis={makeKpis()} comparisonLabel="vs trimestre dernier" />);

		const newCustomersCard = mockKpiCard.mock.calls.find((c) => c[0].title === "Nouveaux clients");
		expect(newCustomersCard?.[0].comparisonLabel).toBe("vs trimestre dernier");
	});

	it("encodes special characters in topSpender email href", () => {
		render(
			<CustomerKpis
				kpis={makeKpis({
					topSpender: {
						userId: "u1",
						customerName: "Charlie",
						customerEmail: "charlie+test@x.com",
						totalSpent: 100,
						orderCount: 1,
					},
				})}
			/>,
		);

		const topSpenderCard = mockKpiCard.mock.calls.find((c) => c[0].title === "Meilleur client");
		expect(topSpenderCard?.[0].href).toBe("/admin/clients?search=charlie%2Btest%40x.com");
	});
});
