import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DashboardActionItems, DashboardAlerts } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("lucide-react", () => ({
	CalendarClock: () => <span data-testid="icon-calendar-clock" />,
	RotateCcw: () => <span data-testid="icon-rotate-ccw" />,
	AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
	Clock: () => <span data-testid="icon-clock" />,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

import { DashboardAlerts as DashboardAlertsComponent } from "../dashboard-alerts";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function makeAlerts(overrides: Partial<DashboardAlerts> = {}): DashboardAlerts {
	return {
		refundsNeedingAttention: 0,
		...overrides,
	};
}

function makeActionItems(overrides: Partial<DashboardActionItems> = {}): DashboardActionItems {
	return {
		overbilledOrders: 0,
		stuckProcessing: 0,
		stuckShipped: 0,
		stuckInvoices: 0,
		orphanPending: 0,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardAlerts", () => {
	it("renders nothing when all counts are 0", () => {
		const { container } = render(<DashboardAlertsComponent alerts={makeAlerts()} />);

		expect(container.firstChild).toBeNull();
	});

	it("renders refund alert", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ refundsNeedingAttention: 3 })} />);

		expect(screen.getByText(/3 remboursements à rattraper/)).toBeInTheDocument();
	});

	it("renders singular remboursement text for 1 refund", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ refundsNeedingAttention: 1 })} />);

		expect(screen.getByText(/1 remboursement à rattraper/)).toBeInTheDocument();
	});

	it("links refund alert to filtered remboursements page", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ refundsNeedingAttention: 1 })} />);

		const link = screen.getByText(/1 remboursement à rattraper/).closest("a");
		expect(link).toHaveAttribute("href", "/admin/ventes/remboursements");
	});

	it("has role=region with aria-label (not status — banner contains interactive links)", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ refundsNeedingAttention: 1 })} />);

		const container = screen.getByRole("region");
		expect(container).toHaveAttribute("aria-label", "Alertes nécessitant ton attention");
	});

	describe("action items (à traiter)", () => {
		it("renders nothing when alerts and action items are all 0", () => {
			const { container } = render(
				<DashboardAlertsComponent alerts={makeAlerts()} actionItems={makeActionItems()} />,
			);

			expect(container.firstChild).toBeNull();
		});

		it("renders a pill per non-zero action item", () => {
			render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					actionItems={makeActionItems({ overbilledOrders: 1, stuckProcessing: 2 })}
				/>,
			);

			expect(screen.getByText("1 commande sur-facturée")).toBeInTheDocument();
			expect(screen.getByText("2 commandes en préparation depuis +7 j")).toBeInTheDocument();
		});

		it("links the stuck-processing pill to the filtered orders page", () => {
			render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					actionItems={makeActionItems({ stuckProcessing: 1 })}
				/>,
			);

			const link = screen.getByText("1 commande en préparation depuis +7 j").closest("a");
			expect(link).toHaveAttribute("href", "/admin/ventes/commandes?filter_status=PROCESSING");
		});
	});

	describe("URSSAF deadline alert", () => {
		it("does not render URSSAF alert when daysUntil > 15", () => {
			const { container } = render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					urssafDeadline={{
						date: new Date("2026-04-30T23:59:59Z"),
						daysUntil: 30,
						quarterLabel: "T1 2026",
					}}
				/>,
			);

			expect(container.firstChild).toBeNull();
		});

		it("renders URSSAF alert when within 15 days", () => {
			render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					urssafDeadline={{
						date: new Date("2026-04-30T23:59:59Z"),
						daysUntil: 12,
						quarterLabel: "T1 2026",
					}}
				/>,
			);

			expect(screen.getByText("Déclaration URSSAF T1 2026 dans 12 jours")).toBeInTheDocument();
		});

		it("uses singular jour when daysUntil is 1", () => {
			render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					urssafDeadline={{
						date: new Date("2026-04-30T23:59:59Z"),
						daysUntil: 1,
						quarterLabel: "T1 2026",
					}}
				/>,
			);

			expect(screen.getByText("Déclaration URSSAF T1 2026 dans 1 jour")).toBeInTheDocument();
		});
	});
});
