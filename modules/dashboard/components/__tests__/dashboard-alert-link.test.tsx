import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		target,
		rel,
		className,
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: () => void;
		target?: string;
		rel?: string;
		className?: string;
	}) => (
		<a href={href} onClick={onClick} target={target} rel={rel} className={className}>
			{children}
		</a>
	),
}));

import { DashboardAlertLink } from "../dashboard-alert-link";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardAlertLink", () => {
	it("renders the icon, label, and an internal Link", () => {
		render(
			<DashboardAlertLink
				href="/admin/ventes/remboursements?filter_status=PENDING"
				tone="warning"
				icon={<span data-testid="icon" />}
			>
				3 remboursements en attente
			</DashboardAlertLink>,
		);

		const link = screen.getByRole("link", { name: /3 remboursements en attente/i });
		expect(link).toHaveAttribute("href", "/admin/ventes/remboursements?filter_status=PENDING");
		expect(link).not.toHaveAttribute("target");
		expect(screen.getByTestId("icon")).toBeInTheDocument();
	});

	it("opens external href in a new tab with noopener noreferrer", () => {
		render(
			<DashboardAlertLink
				href="https://www.autoentrepreneur.urssaf.fr"
				external
				tone="info"
				icon={<span data-testid="icon" />}
			>
				Déclaration URSSAF
			</DashboardAlertLink>,
		);

		const link = screen.getByRole("link", { name: /déclaration urssaf/i });
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});

	/**
	 * @regression no-haptic-on-passive-navigation
	 * Une pastille d'alerte est un LIEN. Le retour haptique est réservé aux
	 * changements d'état signifiants (soumission, destruction, sélection, geste) ;
	 * sur de la navigation il devient du bruit et dilue le signal.
	 */
	it("fires no haptic on click (navigation is passive)", async () => {
		const user = userEvent.setup();
		render(
			<DashboardAlertLink
				href="/admin/ventes/remboursements"
				tone="warning"
				icon={<span data-testid="icon" />}
			>
				Test
			</DashboardAlertLink>,
		);

		await user.click(screen.getByRole("link", { name: /test/i }));
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("applies tone-based background classes", () => {
		const { rerender } = render(
			<DashboardAlertLink href="/foo" tone="info" icon={<span />}>
				Info
			</DashboardAlertLink>,
		);
		expect(screen.getByRole("link")).toHaveClass("border-info/30", "bg-info/5");

		rerender(
			<DashboardAlertLink href="/foo" tone="warning" icon={<span />}>
				Warning
			</DashboardAlertLink>,
		);
		expect(screen.getByRole("link")).toHaveClass("border-warning/30", "bg-warning/5");
	});

	it("includes a 44px (WCAG) minimum touch target via min-h-11 sm:min-h-9", () => {
		render(
			<DashboardAlertLink href="/foo" tone="info" icon={<span />}>
				Test
			</DashboardAlertLink>,
		);
		const link = screen.getByRole("link");
		expect(link.className).toContain("min-h-11");
		expect(link.className).toContain("sm:min-h-9");
	});

	it("includes touch-manipulation + active:scale for tactile feedback", () => {
		render(
			<DashboardAlertLink href="/foo" tone="info" icon={<span />}>
				Test
			</DashboardAlertLink>,
		);
		const link = screen.getByRole("link");
		expect(link.className).toContain("touch-manipulation");
		expect(link.className).toContain("active:scale-[0.98]");
	});
});
