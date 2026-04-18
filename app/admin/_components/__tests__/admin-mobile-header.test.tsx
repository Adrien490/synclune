import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockUsePathname,
	mockGenerateBreadcrumbs,
	mockUseIsScrolled,
	mockRouterBack,
	mockOpenCommandPalette,
	mockTriggerHaptic,
} = vi.hoisted(() => ({
	mockUsePathname: vi.fn(() => "/admin"),
	mockGenerateBreadcrumbs: vi.fn(),
	mockUseIsScrolled: vi.fn(() => false),
	mockRouterBack: vi.fn(),
	mockOpenCommandPalette: vi.fn(),
	mockTriggerHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	usePathname: mockUsePathname,
	useRouter: () => ({ back: mockRouterBack }),
}));

vi.mock("@/shared/hooks/use-is-scrolled", () => ({
	useIsScrolled: mockUseIsScrolled,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ isOpen: false, open: mockOpenCommandPalette, close: vi.fn() }),
}));

vi.mock("../dashboard-breadcrumb", () => ({
	generateBreadcrumbs: mockGenerateBreadcrumbs,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Import AFTER mocks
import { AdminMobileHeader } from "../admin-mobile-header";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	mockGenerateBreadcrumbs.mockReturnValue([
		{ label: "Tableau de bord", href: "/admin", isCurrentPage: false },
		{ label: "Commandes", href: "/admin/ventes/commandes", isCurrentPage: true },
	]);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("AdminMobileHeader", () => {
	// ============================================================================
	// Accessibility and structure
	// ============================================================================

	describe("accessibility and structure", () => {
		it('renders with role="banner"', () => {
			render(<AdminMobileHeader />);

			expect(screen.getByRole("banner")).toBeInTheDocument();
		});

		it('renders with aria-label="En-tête mobile administration"', () => {
			render(<AdminMobileHeader />);

			expect(
				screen.getByRole("banner", { name: "En-tête mobile administration" }),
			).toBeInTheDocument();
		});
	});

	// ============================================================================
	// Page title from breadcrumbs
	// ============================================================================

	describe("page title", () => {
		it("shows the last breadcrumb label as page title", () => {
			mockGenerateBreadcrumbs.mockReturnValue([
				{ label: "Tableau de bord", href: "/admin", isCurrentPage: false },
				{ label: "Commandes", href: "/admin/ventes/commandes", isCurrentPage: true },
			]);

			render(<AdminMobileHeader />);

			expect(screen.getByRole("heading", { name: "Commandes" })).toBeInTheDocument();
		});

		it('shows "Administration" as fallback when breadcrumbs are empty', () => {
			mockGenerateBreadcrumbs.mockReturnValue([]);

			render(<AdminMobileHeader />);

			expect(screen.getByRole("heading", { name: "Administration" })).toBeInTheDocument();
		});

		it("shows dashboard label when only the root breadcrumb is present", () => {
			mockGenerateBreadcrumbs.mockReturnValue([
				{ label: "Tableau de bord", href: "/admin", isCurrentPage: true },
			]);

			render(<AdminMobileHeader />);

			expect(screen.getByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
		});

		it("passes the current pathname to generateBreadcrumbs", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");

			render(<AdminMobileHeader />);

			expect(mockGenerateBreadcrumbs).toHaveBeenCalledWith("/admin/catalogue/produits");
		});
	});

	// ============================================================================
	// Scroll-aware styling
	// ============================================================================

	describe("scroll-aware styling", () => {
		it("calls useIsScrolled with threshold 20", () => {
			render(<AdminMobileHeader />);

			expect(mockUseIsScrolled).toHaveBeenCalledWith(20);
		});

		it("has transparent background when not scrolled", () => {
			mockUseIsScrolled.mockReturnValue(false);

			render(<AdminMobileHeader />);

			expect(screen.getByRole("banner")).toHaveClass("bg-transparent");
		});

		it("has glass effect background when scrolled", () => {
			mockUseIsScrolled.mockReturnValue(true);

			render(<AdminMobileHeader />);

			expect(screen.getByRole("banner")).toHaveClass("backdrop-blur-xl");
		});
	});

	// ============================================================================
	// CSS classes
	// ============================================================================

	describe("CSS classes", () => {
		it("header has pwa-header class", () => {
			render(<AdminMobileHeader />);

			expect(screen.getByRole("banner")).toHaveClass("pwa-header");
		});

		it("header has md:hidden class", () => {
			render(<AdminMobileHeader />);

			expect(screen.getByRole("banner")).toHaveClass("md:hidden");
		});

		it("header has fixed positioning class", () => {
			render(<AdminMobileHeader />);

			expect(screen.getByRole("banner")).toHaveClass("fixed");
		});

		it("header has z-40 class", () => {
			render(<AdminMobileHeader />);

			expect(screen.getByRole("banner")).toHaveClass("z-40");
		});

		it("header uses --admin-header-height var for height (single source of truth)", () => {
			render(<AdminMobileHeader />);

			expect(screen.getByRole("banner")).toHaveClass("h-[var(--admin-header-height,3.5rem)]");
		});

		it("inner row uses --admin-main-x var for horizontal padding (gutter parity with main)", () => {
			render(<AdminMobileHeader />);

			const banner = screen.getByRole("banner");
			const inner = banner.firstElementChild as HTMLElement;
			expect(inner.className).toContain("px-[var(--admin-main-x,1.5rem)]");
		});
	});

	// ============================================================================
	// Accessibility: live region announces page title changes
	// ============================================================================

	describe("aria-live announcer", () => {
		it("renders a polite live region with the current page title", () => {
			mockGenerateBreadcrumbs.mockReturnValue([
				{ label: "Tableau de bord", href: "/admin", isCurrentPage: false },
				{ label: "Commandes", href: "/admin/ventes/commandes", isCurrentPage: true },
			]);

			render(<AdminMobileHeader />);

			const live = screen.getByRole("status");
			expect(live).toHaveAttribute("aria-live", "polite");
			expect(live).toHaveAttribute("aria-atomic", "true");
			expect(live).toHaveTextContent("Page actuelle : Commandes");
		});
	});

	// ============================================================================
	// Detail routes: parent breadcrumb label
	// ============================================================================

	describe("parent breadcrumb on detail routes", () => {
		it("shows parent label above title on detail routes", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits/bracelet-x");
			mockGenerateBreadcrumbs.mockReturnValue([
				{ label: "Tableau de bord", href: "/admin", isCurrentPage: false },
				{ label: "Catalogue", href: "/admin/catalogue", isCurrentPage: false },
				{ label: "Produits", href: "/admin/catalogue/produits", isCurrentPage: false },
				{
					label: "Bracelet X",
					href: "/admin/catalogue/produits/bracelet-x",
					isCurrentPage: true,
				},
			]);

			render(<AdminMobileHeader />);

			expect(screen.getByText("Produits")).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: "Bracelet X" })).toBeInTheDocument();
		});

		it("does not show parent label on non-detail routes", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			mockGenerateBreadcrumbs.mockReturnValue([
				{ label: "Tableau de bord", href: "/admin", isCurrentPage: false },
				{ label: "Catalogue", href: "/admin/catalogue", isCurrentPage: false },
				{ label: "Produits", href: "/admin/catalogue/produits", isCurrentPage: true },
			]);

			render(<AdminMobileHeader />);

			expect(screen.queryByText("Catalogue")).not.toBeInTheDocument();
			expect(screen.getByRole("heading", { name: "Produits" })).toBeInTheDocument();
		});
	});

	// ============================================================================
	// Haptic feedback
	// ============================================================================

	describe("haptic feedback", () => {
		it("back button fires selection haptic (iOS HIG navigation pattern)", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits/bracelet-x");
			mockGenerateBreadcrumbs.mockReturnValue([
				{ label: "Tableau de bord", href: "/admin", isCurrentPage: false },
				{ label: "Produits", href: "/admin/catalogue/produits", isCurrentPage: false },
				{
					label: "Bracelet X",
					href: "/admin/catalogue/produits/bracelet-x",
					isCurrentPage: true,
				},
			]);

			render(<AdminMobileHeader />);
			screen.getByRole("button", { name: "Retour" }).click();

			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
			expect(mockRouterBack).toHaveBeenCalledTimes(1);
		});

		it("search button fires light haptic (secondary action)", () => {
			render(<AdminMobileHeader />);
			screen.getByRole("button", { name: "Rechercher" }).click();

			expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
			expect(mockOpenCommandPalette).toHaveBeenCalledTimes(1);
		});
	});
});
