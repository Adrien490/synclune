import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUsePathname, mockOpenSearch, mockUseDialog, mockGenerateBreadcrumbs } = vi.hoisted(
	() => ({
		mockUsePathname: vi.fn(() => "/admin"),
		mockOpenSearch: vi.fn(),
		mockUseDialog: vi.fn(),
		mockGenerateBreadcrumbs: vi.fn(),
	}),
);

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	usePathname: mockUsePathname,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: mockUseDialog,
}));

vi.mock("../admin-menu-sheet", () => ({
	AdminMenuSheetTrigger: ({ className }: { className?: string }) => (
		<button type="button" data-testid="menu-sheet-trigger" className={className}>
			Menu
		</button>
	),
}));

vi.mock("../dashboard-breadcrumb", () => ({
	generateBreadcrumbs: mockGenerateBreadcrumbs,
}));

vi.mock("lucide-react", () => ({
	Search: ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
		<svg data-testid="search-icon" className={className} {...props} />
	),
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
	mockUseDialog.mockReturnValue({ open: mockOpenSearch });
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

		it("search button has aria-label Recherche rapide", () => {
			render(<AdminMobileHeader />);

			expect(screen.getByRole("button", { name: "Recherche rapide" })).toBeInTheDocument();
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
	// Search button interaction
	// ============================================================================

	describe("search button", () => {
		it('calls open() from useDialog("command-palette") when clicked', () => {
			render(<AdminMobileHeader />);

			fireEvent.click(screen.getByRole("button", { name: "Recherche rapide" }));

			expect(mockOpenSearch).toHaveBeenCalledTimes(1);
		});

		it('calls useDialog with "command-palette"', () => {
			render(<AdminMobileHeader />);

			expect(mockUseDialog).toHaveBeenCalledWith("command-palette");
		});

		it("renders the search icon inside the search button", () => {
			render(<AdminMobileHeader />);

			expect(screen.getByTestId("search-icon")).toBeInTheDocument();
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
	});

	// ============================================================================
	// Child components
	// ============================================================================

	describe("child components", () => {
		it("renders the AdminMenuSheetTrigger", () => {
			render(<AdminMobileHeader />);

			expect(screen.getByTestId("menu-sheet-trigger")).toBeInTheDocument();
		});
	});
});
