import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as LucideReact from "lucide-react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsMenuOpen, mockOpenMenu, mockCloseMenu, mockUsePathname, mockIsRouteActive } =
	vi.hoisted(() => ({
		mockIsMenuOpen: { current: false },
		mockOpenMenu: vi.fn(),
		mockCloseMenu: vi.fn(),
		mockUsePathname: vi.fn(() => "/admin"),
		mockIsRouteActive: vi.fn(() => false),
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
	};
});

vi.mock("next/navigation", () => ({
	usePathname: mockUsePathname,
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
	useDialog: () => ({
		isOpen: mockIsMenuOpen.current,
		open: mockOpenMenu,
		close: mockCloseMenu,
	}),
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
}));

import { AdminMobileBottomBar, ROUTES_WITH_PAGE_BOTTOM_BAR } from "../admin-mobile-bottom-bar";

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

		it("renders 3 tab links + 1 menu button", () => {
			render(<AdminMobileBottomBar />);
			expect(screen.getByText("Accueil")).toBeInTheDocument();
			expect(screen.getByText("Commandes")).toBeInTheDocument();
			expect(screen.getByText("Produits")).toBeInTheDocument();
			expect(screen.getByText("Menu")).toBeInTheDocument();
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
			const menuButton = screen.getByRole("button");
			expect(menuButton).toHaveAttribute("aria-haspopup", "dialog");
		});

		it("sets aria-expanded when menu is open", () => {
			mockIsMenuOpen.current = true;
			render(<AdminMobileBottomBar />);
			const menuButton = screen.getByRole("button");
			expect(menuButton).toHaveAttribute("aria-expanded", "true");
		});
	});

	describe("visibility", () => {
		it("hides when menu is open", () => {
			mockIsMenuOpen.current = true;
			render(<AdminMobileBottomBar />);
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("hides on routes with page-specific bottom bars", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			render(<AdminMobileBottomBar />);
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("is visible on routes without page-specific bottom bars", () => {
			mockUsePathname.mockReturnValue("/admin");
			render(<AdminMobileBottomBar />);
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "false");
		});
	});

	describe("ROUTES_WITH_PAGE_BOTTOM_BAR", () => {
		it("includes expected routes", () => {
			expect(ROUTES_WITH_PAGE_BOTTOM_BAR).toContain("/admin/catalogue/produits");
			expect(ROUTES_WITH_PAGE_BOTTOM_BAR).toContain("/admin/marketing/discounts");
			expect(ROUTES_WITH_PAGE_BOTTOM_BAR).toContain("/admin/ventes/commandes");
		});
	});
});
