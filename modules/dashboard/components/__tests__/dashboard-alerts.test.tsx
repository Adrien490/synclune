import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DashboardAlerts } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("lucide-react", () => ({
	CalendarClock: () => <span data-testid="icon-calendar-clock" />,
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

		it("renders VAT alert as non-interactive (no anchor)", () => {
			render(
				<DashboardAlertsComponent
					alerts={makeAlerts()}
					vatProgress={{ ytdRevenue: 3100000, threshold: 3750000, progress: 82.6, year: 2026 }}
				/>,
			);

			expect(screen.getByText(/Seuil TVA/).closest("a")).toBeNull();
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
