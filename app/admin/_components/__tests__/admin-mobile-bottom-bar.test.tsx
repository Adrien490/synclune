import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as LucideReact from "lucide-react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockIsMenuOpen,
	mockOpenMenu,
	mockCloseMenu,
	mockOpenCommandPalette,
	mockCloseCommandPalette,
	mockUsePathname,
	mockIsRouteActive,
	mockTriggerHaptic,
} = vi.hoisted(() => ({
	mockIsMenuOpen: { current: false },
	mockOpenMenu: vi.fn(),
	mockCloseMenu: vi.fn(),
	mockOpenCommandPalette: vi.fn(),
	mockCloseCommandPalette: vi.fn(),
	mockUsePathname: vi.fn(() => "/admin"),
	mockIsRouteActive: vi.fn(() => false),
	mockTriggerHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<typeof LucideReact>();
	return {
		...actual,
		LayoutDashboard: (props: Record<string, unknown>) => (
			<svg data-testid="icon-dashboard" {...props} />
		),
		ShoppingBag: (props: Record<string, unknown>) => <svg data-testid="icon-orders" {...props} />,
		Package: (props: Record<string, unknown>) => <svg data-testid="icon-products" {...props} />,
		Menu: (props: Record<string, unknown>) => <svg data-testid="icon-menu" {...props} />,
		Sparkles: (props: Record<string, unknown>) => <svg data-testid="icon-sparkles" {...props} />,
	};
});

vi.mock("next/navigation", () => ({
	usePathname: mockUsePathname,
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (key: string) => {
		if (key === "command-palette") {
			return {
				isOpen: false,
				open: mockOpenCommandPalette,
				close: mockCloseCommandPalette,
			};
		}
		return {
			isOpen: mockIsMenuOpen.current,
			open: mockOpenMenu,
			close: mockCloseMenu,
		};
	},
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/shared/lib/navigation", () => ({
	isRouteActive: mockIsRouteActive,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string")
			.join(" "),
}));

vi.mock("@/shared/components/bottom-bar", () => ({
	BottomBar: ({
		children,
		"aria-label": ariaLabel,
		isHidden,
	}: {
		children: React.ReactNode;
		as?: string;
		"aria-label"?: string;
		isHidden?: boolean;
	}) => (
		<nav data-testid="bottom-bar" aria-label={ariaLabel} data-hidden={isHidden}>
			{children}
		</nav>
	),
	ActiveDot: () => <span data-testid="active-dot" />,
	bottomBarContainerClass: "container",
	bottomBarItemClass: "item",
	bottomBarActiveItemClass: "active",
	bottomBarIconClass: "icon",
	bottomBarLabelClass: "label",
	bottomBarCenterActionClass: "center-action",
	bottomBarCenterButtonClass: "center-button",
	bottomBarCenterLabelClass: "center-label",
}));

import { AdminMobileBottomBar } from "../admin-mobile-bottom-bar";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockIsMenuOpen.current = false;
	mockUsePathname.mockReturnValue("/admin");
	mockIsRouteActive.mockReturnValue(false);
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("AdminMobileBottomBar", () => {
	describe("rendering", () => {
		it("renders via portal to document.body", () => {
			render(<AdminMobileBottomBar />);
			const bar = screen.getByTestId("bottom-bar");
			expect(bar).toBeInTheDocument();
		});

		it('has aria-label "Navigation principale administration"', () => {
			render(<AdminMobileBottomBar />);
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute(
				"aria-label",
				"Navigation principale administration",
			);
		});

		it("renders 3 tab links + FAB + 1 menu button", () => {
			render(<AdminMobileBottomBar />);
			expect(screen.getByText("Accueil")).toBeInTheDocument();
			expect(screen.getByText("Commandes")).toBeInTheDocument();
			expect(screen.getByText("Actions")).toBeInTheDocument();
			expect(screen.getByText("Produits")).toBeInTheDocument();
			expect(screen.getByText("Menu")).toBeInTheDocument();
		});
	});

	describe("FAB center button", () => {
		it("renders Sparkles icon", () => {
			render(<AdminMobileBottomBar />);
			expect(screen.getByTestId("icon-sparkles")).toBeInTheDocument();
		});

		it("opens command palette on click", () => {
			render(<AdminMobileBottomBar />);
			fireEvent.click(screen.getByLabelText("Ouvrir la recherche et les actions rapides"));
			expect(mockOpenCommandPalette).toHaveBeenCalled();
		});

		it("triggers medium haptic on FAB click", () => {
			render(<AdminMobileBottomBar />);
			fireEvent.click(screen.getByLabelText("Ouvrir la recherche et les actions rapides"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
		});

		it("has aria-haspopup=dialog", () => {
			render(<AdminMobileBottomBar />);
			const fab = screen.getByLabelText("Ouvrir la recherche et les actions rapides");
			expect(fab).toHaveAttribute("aria-haspopup", "dialog");
		});
	});

	describe("haptic feedback", () => {
		it("triggers light haptic when navigating to an inactive tab", () => {
			mockIsRouteActive.mockImplementation(() => false);
			render(<AdminMobileBottomBar />);
			fireEvent.click(screen.getByRole("link", { name: /Accueil/i }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
		});

		it("does not trigger haptic when clicking the active tab", () => {
			mockIsRouteActive.mockImplementation((...args: unknown[]) => args[1] === "/admin");
			render(<AdminMobileBottomBar />);
			fireEvent.click(screen.getByRole("link", { name: /Accueil/i }));
			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});

		it("triggers light haptic when toggling menu", () => {
			render(<AdminMobileBottomBar />);
			fireEvent.click(screen.getByLabelText("Ouvrir le menu de navigation"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
		});
	});

	describe("tab links", () => {
		it("renders correct hrefs", () => {
			render(<AdminMobileBottomBar />);
			expect(screen.getByRole("link", { name: /Accueil/i })).toHaveAttribute("href", "/admin");
			expect(screen.getByRole("link", { name: /Commandes/i })).toHaveAttribute(
				"href",
				"/admin/ventes/commandes",
			);
			expect(screen.getByRole("link", { name: /Produits/i })).toHaveAttribute(
				"href",
				"/admin/catalogue/produits",
			);
		});

		it("sets aria-current on active tab", () => {
			mockIsRouteActive.mockImplementation((...args: unknown[]) => args[1] === "/admin");
			render(<AdminMobileBottomBar />);
			const dashboardLink = screen.getByRole("link", { name: /Accueil/i });
			expect(dashboardLink).toHaveAttribute("aria-current", "page");
		});

		it("shows ActiveDot on active tab", () => {
			mockIsRouteActive.mockImplementation((...args: unknown[]) => args[1] === "/admin");
			render(<AdminMobileBottomBar />);
			expect(screen.getAllByTestId("active-dot").length).toBeGreaterThan(0);
		});
	});

	describe("badges", () => {
		it("shows badge on orders tab", () => {
			render(<AdminMobileBottomBar badges={{ orders: 3 }} />);
			expect(screen.getByText("3")).toBeInTheDocument();
		});

		it("caps badge at 99+", () => {
			render(<AdminMobileBottomBar badges={{ orders: 200 }} />);
			expect(screen.getByText("99+")).toBeInTheDocument();
		});

		it("does not show badge when count is 0", () => {
			render(<AdminMobileBottomBar badges={{ orders: 0 }} />);
			expect(screen.queryByLabelText(/en attente/)).not.toBeInTheDocument();
		});

		it("shows correct aria-label for badge", () => {
			render(<AdminMobileBottomBar badges={{ orders: 5 }} />);
			expect(screen.getByLabelText("5 commandes en attente")).toBeInTheDocument();
		});

		it("uses singular for 1 order", () => {
			render(<AdminMobileBottomBar badges={{ orders: 1 }} />);
			expect(screen.getByLabelText("1 commande en attente")).toBeInTheDocument();
		});
	});

	describe("menu button", () => {
		it("opens menu on click when closed", () => {
			mockIsMenuOpen.current = false;
			render(<AdminMobileBottomBar />);
			fireEvent.click(screen.getByLabelText("Ouvrir le menu de navigation"));
			expect(mockOpenMenu).toHaveBeenCalled();
		});

		it("closes menu on click when open", () => {
			mockIsMenuOpen.current = true;
			render(<AdminMobileBottomBar />);
			fireEvent.click(screen.getByLabelText("Fermer le menu de navigation"));
			expect(mockCloseMenu).toHaveBeenCalled();
		});

		it("has aria-haspopup=dialog", () => {
			render(<AdminMobileBottomBar />);
			const menuButton = screen.getByLabelText("Ouvrir le menu de navigation");
			expect(menuButton).toHaveAttribute("aria-haspopup", "dialog");
		});

		it("sets aria-expanded when menu is open", () => {
			mockIsMenuOpen.current = true;
			render(<AdminMobileBottomBar />);
			const menuButton = screen.getByLabelText("Fermer le menu de navigation");
			expect(menuButton).toHaveAttribute("aria-expanded", "true");
		});
	});

	describe("visibility", () => {
		it("hides when menu is open", () => {
			mockIsMenuOpen.current = true;
			render(<AdminMobileBottomBar />);
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("stays visible on routes that previously had contextual bottom bars", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			render(<AdminMobileBottomBar />);
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "false");
		});

		it("is visible on routes without page-specific bottom bars", () => {
			mockUsePathname.mockReturnValue("/admin");
			render(<AdminMobileBottomBar />);
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "false");
		});
	});
});
