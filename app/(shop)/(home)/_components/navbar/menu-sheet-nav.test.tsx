import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link — preserves prefetch as data-prefetch attr (DOM-warning-safe + testable)
vi.mock("next/link", () => ({
	default: ({
		href,
		prefetch,
		children,
		...props
	}: {
		href: string;
		prefetch?: boolean | null;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a
			href={href}
			data-prefetch={prefetch === null ? "null" : prefetch === false ? "false" : "auto"}
			{...props}
		>
			{children}
		</a>
	),
}));

// Mock SheetClose to render children directly
vi.mock("@/shared/components/ui/sheet", () => ({
	SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock CountBadge — favorites link uses the SSOT CountBadge with type="count"
// and variant="inline" in the menu sheet flow.
vi.mock("@/shared/components/ui/count-badge", () => ({
	CountBadge: ({ count }: { count: number }) =>
		count > 0 ? <span data-testid="count-badge">{count}</span> : null,
}));

// Mock LogoutAlertDialog
vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./menu-sheet-nav-sections", async (importOriginal) => {
	const original = (await importOriginal()) as Record<string, unknown>;
	return {
		...original,
		UserHeader: () => <div data-testid="user-header" />,
	};
});

// Mock hooks
vi.mock("@/shared/hooks/use-active-navbar-item", () => ({
	useActiveNavbarItem: () => ({
		isMenuItemActive: () => false,
	}),
}));

const mockStore = { wishlistCount: 2, cartCount: 1 };
vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

import { MenuSheetNav } from "./menu-sheet-nav";
import { ROUTES } from "@/shared/constants/urls";

afterEach(cleanup);

const productTypes = [
	{ slug: "bagues", label: "Bagues" },
	{ slug: "colliers", label: "Colliers" },
];

const collections = [
	{
		slug: "mariage",
		label: "Mariage",
		images: [{ url: "/img.jpg", blurDataUrl: null, alt: null }],
	},
];

const baseNavItems = [
	{ href: "/", label: "Accueil", icon: "home" as const },
	{ href: "/produits", label: "Les créations", icon: "gem" as const, hasDropdown: true },
	{
		href: "/collections",
		label: "Les collections",
		icon: "folder-open" as const,
		hasDropdown: true,
	},
	// "L'atelier" (ROUTES.SHOP.ABOUT) retiré temporairement de getMobileNavItems.
	{ href: "/commandes", label: "Mon compte", icon: "user" as const },
	{ href: "/favoris", label: "Mes favoris", icon: "heart" as const },
];

describe("MenuSheetNav", () => {
	describe("sections", () => {
		it("renders discover, creations, collections, and account sections", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			expect(screen.getByText("Découvrir")).toBeInTheDocument();
			expect(screen.getByText("Nos créations")).toBeInTheDocument();
			expect(screen.getByText("Collections")).toBeInTheDocument();
			expect(screen.getByText("Compte")).toBeInTheDocument();
		});

		// "L'atelier" (ROUTES.SHOP.ABOUT) retiré temporairement de getMobileNavItems
		// (à réintégrer plus tard) → ne doit plus apparaître dans le menu mobile.
		it("does not render the 'L'atelier' link", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			expect(screen.queryByRole("link", { name: "L'atelier" })).toBeNull();
		});

		it("renders product type links using ROUTES", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			const baguesLink = screen.getByRole("link", { name: "Bagues" });
			expect(baguesLink.getAttribute("href")).toBe("/produits/bagues");

			const colliersLink = screen.getByRole("link", { name: "Colliers" });
			expect(colliersLink.getAttribute("href")).toBe("/produits/colliers");
		});

		it("renders collection links using ROUTES", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			const mariageLink = screen.getByRole("link", { name: /Mariage/ });
			expect(mariageLink.getAttribute("href")).toBe("/collections/mariage");
		});
	});

	describe("focus management", () => {
		// @regression menu-mobile-focus-preventscroll
		// applyFocus() centers the active item then focuses the first link. Without
		// preventScroll, focus() re-scrolls to top and negates the centering. The
		// first link must be focused with { preventScroll: true }.
		it("focuses the first nav link with preventScroll (preserves scroll-to-active)", () => {
			const focusSpy = vi.spyOn(HTMLAnchorElement.prototype, "focus");
			try {
				render(
					<MenuSheetNav
						navItems={baseNavItems}
						productTypes={productTypes}
						collections={collections}
						session={null}
					/>,
				);

				expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
			} finally {
				focusSpy.mockRestore();
			}
		});
	});

	describe("logged out", () => {
		it("shows sign-in link and sign-up link", () => {
			const loggedOutNavItems = baseNavItems.map((item) =>
				item.href === "/commandes"
					? { ...item, href: "/connexion", label: "Se connecter", icon: "log-in" as const }
					: item,
			);

			render(
				<MenuSheetNav
					navItems={loggedOutNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			expect(screen.getByRole("link", { name: "Se connecter" })).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Créer un compte" })).toBeInTheDocument();
		});

		it("does not render user header", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			expect(screen.queryByTestId("user-header")).toBeNull();
		});
	});

	describe("logged in", () => {
		const session = {
			user: {
				name: "Alice",
				email: "alice@test.com",
				image: null,
				role: "USER" as const,
			},
		};

		it("renders user header", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={session}
				/>,
			);

			expect(screen.getByTestId("user-header")).toBeInTheDocument();
		});

		it("renders favorites with badge count", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={session}
				/>,
			);

			const badge = screen.getByTestId("count-badge");
			expect(badge.textContent).toBe("2");
		});

		it("renders the logout button", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={session}
				/>,
			);

			expect(screen.getByRole("button", { name: "Déconnexion" })).toBeInTheDocument();
		});

		it("ne rend PAS d'entrée « Mes commandes » séparée quand elle double « Mon compte »", () => {
			// `ROUTES.ACCOUNT.ROOT` et `ROUTES.ACCOUNT.ORDERS` valent tous deux
			// « /commandes » : rendre les deux produisait deux entrées vers la même
			// URL, toutes deux marquées `aria-current="page"` sur /commandes.
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={session}
				/>,
			);

			expect(screen.queryByRole("link", { name: "Mes commandes" })).not.toBeInTheDocument();

			const accountLinks = screen
				.getAllByRole("link")
				.filter((l) => l.getAttribute("href") === ROUTES.ACCOUNT.ROOT);
			expect(accountLinks).toHaveLength(1);
		});

		it("rend « Mes favoris » même sans session (parité bottom bar / navbar)", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			expect(screen.getByRole("link", { name: /Mes favoris/ })).toBeInTheDocument();
		});
	});
});
