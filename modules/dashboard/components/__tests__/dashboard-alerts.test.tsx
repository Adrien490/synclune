import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DashboardAlerts } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("lucide-react", () => ({
	AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
	CalendarClock: () => <span data-testid="icon-calendar-clock" />,
	PackageX: () => <span data-testid="icon-package-x" />,
	Receipt: () => <span data-testid="icon-receipt" />,
	RotateCcw: () => <span data-testid="icon-rotate-ccw" />,
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

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} className={className}>
			{children}
		</span>
	),
}));

import { DashboardAlerts as DashboardAlertsComponent } from "../dashboard-alerts";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function makeAlerts(overrides: Partial<DashboardAlerts> = {}): DashboardAlerts {
	return {
		pendingRefunds: 0,
		activeDisputes: 0,
		lowStockSkus: 0,
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

	it("renders dispute alert with Urgent badge", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ activeDisputes: 2 })} />);

		expect(screen.getByText("2 litiges Stripe")).toBeInTheDocument();
		expect(screen.getByText("Urgent")).toBeInTheDocument();
	});

	it("renders singular litige text for 1 dispute", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ activeDisputes: 1 })} />);

		expect(screen.getByText("1 litige Stripe")).toBeInTheDocument();
	});

	it("links dispute alert to litiges page", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ activeDisputes: 1 })} />);

		const link = screen.getByText("1 litige Stripe").closest("a");
		expect(link).toHaveAttribute("href", "/admin/ventes/litiges");
	});

	it("renders refund alert", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ pendingRefunds: 3 })} />);

		expect(screen.getByText("3 remboursements en attente")).toBeInTheDocument();
	});

	it("renders singular remboursement text for 1 refund", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ pendingRefunds: 1 })} />);

		expect(screen.getByText("1 remboursement en attente")).toBeInTheDocument();
	});

	it("links refund alert to filtered remboursements page", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ pendingRefunds: 1 })} />);

		const link = screen.getByText("1 remboursement en attente").closest("a");
		expect(link).toHaveAttribute("href", "/admin/ventes/remboursements?filter_status=PENDING");
	});

	it("renders low stock alert", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ lowStockSkus: 7 })} />);

		expect(screen.getByText("7 SKUs stock bas")).toBeInTheDocument();
	});

	it("renders singular SKU text for 1 low stock", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ lowStockSkus: 1 })} />);

		expect(screen.getByText("1 SKU stock bas")).toBeInTheDocument();
	});

	it("renders all alerts when all counts > 0", () => {
		render(
			<DashboardAlertsComponent
				alerts={makeAlerts({ pendingRefunds: 2, activeDisputes: 1, lowStockSkus: 5 })}
			/>,
		);

		expect(screen.getByText("1 litige Stripe")).toBeInTheDocument();
		expect(screen.getByText("2 remboursements en attente")).toBeInTheDocument();
		expect(screen.getByText("5 SKUs stock bas")).toBeInTheDocument();
	});

	it("renders only relevant alerts", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ lowStockSkus: 3 })} />);

		expect(screen.getByText("3 SKUs stock bas")).toBeInTheDocument();
		expect(screen.queryByText(/litige/)).toBeNull();
		expect(screen.queryByText(/remboursement/)).toBeNull();
	});

	it("has role=status with aria-label", () => {
		render(<DashboardAlertsComponent alerts={makeAlerts({ pendingRefunds: 1 })} />);

		const container = screen.getByRole("status");
		expect(container).toHaveAttribute("aria-label", "Alertes nécessitant votre attention");
	});

	describe("VAT threshold alert", () => {
		it("does not render VAT alert below 80%", () => {
			const { container } = render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					vatProgress={{ ytdRevenue: 1000000, threshold: 3750000, progress: 50, year: 2026 }}
				/>,
			);

			expect(container.firstChild).toBeNull();
		});

		it("renders VAT alert when progress >= 80%", () => {
			render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					vatProgress={{ ytdRevenue: 3100000, threshold: 3750000, progress: 82.6, year: 2026 }}
				/>,
			);

			expect(screen.getByText(/Seuil TVA 2026 atteint à 83 %/)).toBeInTheDocument();
		});

		it("renders Bascule TVA badge when progress >= 100%", () => {
			render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					vatProgress={{ ytdRevenue: 4000000, threshold: 3750000, progress: 106.7, year: 2026 }}
				/>,
			);

			expect(screen.getByText("Bascule TVA")).toBeInTheDocument();
		});

		it("links VAT alert to year-scoped orders page", () => {
			render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					vatProgress={{ ytdRevenue: 3100000, threshold: 3750000, progress: 82.6, year: 2026 }}
				/>,
			);

			const link = screen.getByText(/Seuil TVA/).closest("a");
			expect(link).toHaveAttribute("href", "/admin/ventes/commandes?period=year");
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
