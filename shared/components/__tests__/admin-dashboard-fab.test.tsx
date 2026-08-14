import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsAdmin, mockGetFabVisibility } = vi.hoisted(() => ({
	mockIsAdmin: vi.fn(),
	mockGetFabVisibility: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@/shared/data/get-fab-visibility", () => ({
	getFabVisibility: mockGetFabVisibility,
}));

vi.mock("@/shared/components/fab", () => ({
	Fab: ({
		fabKey,
		initialHidden,
		ariaLabel,
		href,
		hideOnMobile,
		tooltip,
	}: {
		fabKey: string;
		initialHidden: boolean;
		ariaLabel: string;
		href?: string;
		hideOnMobile?: boolean;
		tooltip: { title: string };
	}) => (
		<div
			data-testid="fab"
			data-fab-key={fabKey}
			data-initial-hidden={String(initialHidden)}
			data-aria-label={ariaLabel}
			data-href={href}
			data-hide-on-mobile={String(hideOnMobile)}
			data-tooltip-title={tooltip.title}
		/>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	SquaresFourIcon: ({ className }: { className?: string }) => (
		<span data-testid="layout-dashboard-icon" className={className} aria-hidden="true" />
	),
}));

vi.mock("@/shared/constants/urls", () => ({
	ROUTES: {
		ADMIN: {
			ROOT: "/admin",
		},
	},
}));

vi.mock("@/shared/constants/fab", () => ({
	FAB_KEYS: {
		ADMIN_DASHBOARD: "admin-dashboard",
	},
}));

import { AdminDashboardFab } from "../admin-dashboard-fab";

// ============================================================================
// HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

async function renderComponent() {
	const result = await AdminDashboardFab();
	if (result) render(result);
	return result;
}

// ============================================================================
// TESTS
// ============================================================================

describe("AdminDashboardFab", () => {
	describe("auth gating", () => {
		it("returns null when the caller is not the admin", async () => {
			mockIsAdmin.mockResolvedValue(false);

			const result = await AdminDashboardFab();

			expect(result).toBeNull();
		});
	});

	describe("rendering for ADMIN role", () => {
		beforeEach(() => {
			mockIsAdmin.mockResolvedValue(true);
			mockGetFabVisibility.mockResolvedValue(false);
		});

		it("renders the Fab component when user is ADMIN", async () => {
			await renderComponent();

			expect(screen.getByTestId("fab")).toBeInTheDocument();
		});

		it("passes the correct fabKey (FAB_KEYS.ADMIN_DASHBOARD)", async () => {
			await renderComponent();

			expect(screen.getByTestId("fab")).toHaveAttribute("data-fab-key", "admin-dashboard");
		});

		it("passes initialHidden=false when getFabVisibility returns false", async () => {
			mockGetFabVisibility.mockResolvedValue(false);

			await renderComponent();

			expect(screen.getByTestId("fab")).toHaveAttribute("data-initial-hidden", "false");
		});

		it("passes initialHidden=true when getFabVisibility returns true", async () => {
			mockGetFabVisibility.mockResolvedValue(true);

			await renderComponent();

			expect(screen.getByTestId("fab")).toHaveAttribute("data-initial-hidden", "true");
		});

		it("passes the correct href (ROUTES.ADMIN.ROOT)", async () => {
			await renderComponent();

			expect(screen.getByTestId("fab")).toHaveAttribute("data-href", "/admin");
		});

		it("passes hideOnMobile=true", async () => {
			await renderComponent();

			expect(screen.getByTestId("fab")).toHaveAttribute("data-hide-on-mobile", "true");
		});

		it("passes the correct ariaLabel", async () => {
			await renderComponent();

			expect(screen.getByTestId("fab")).toHaveAttribute(
				"data-aria-label",
				"Accéder au tableau de bord administrateur",
			);
		});

		it("passes the correct tooltip title", async () => {
			await renderComponent();

			expect(screen.getByTestId("fab")).toHaveAttribute("data-tooltip-title", "Tableau de bord");
		});

		it("calls getFabVisibility with FAB_KEYS.ADMIN_DASHBOARD", async () => {
			await renderComponent();

			expect(mockGetFabVisibility).toHaveBeenCalledWith("admin-dashboard");
		});
	});
});
