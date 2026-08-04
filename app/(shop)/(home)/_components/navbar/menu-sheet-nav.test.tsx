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
	// Plus d'item compte : retrait de l'espace client (2026-07-31).
	{ href: "/favoris", label: "Mes favoris", icon: "heart" as const },
];

describe("MenuSheetNav", () => {
	describe("sections", () => {
		it("renders creations, collections, and favorites sections", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			expect(screen.getByText("Nos créations")).toBeInTheDocument();
			expect(screen.getByText("Collections")).toBeInTheDocument();
			expect(screen.getByRole("link", { name: /Mes favoris/ })).toBeInTheDocument();
		});

		// Même raison exactement que l'en-tête « Découvrir » ci-dessous : il coiffait
		// UN seul lien pour tout le trafic public — et il s'appelait « Favoris »
		// au-dessus de « Mes favoris ». Le nom de la région survit en `aria-label`.
		it("n'affiche plus l'en-tête « Favoris », mais garde la région nommée", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			expect(screen.queryByRole("heading", { name: "Favoris" })).toBeNull();
			expect(screen.getByRole("region", { name: "Favoris et compte" })).toBeInTheDocument();
		});

		// L'en-tête « Découvrir » coiffait DEUX entrées ; depuis que « L'atelier »
		// ne sort plus de `getMobileNavItems`, il n'en restait qu'une — un titre de
		// section pour le seul lien « Accueil ». Le lien reste, l'en-tête part.
		it("n'affiche plus l'en-tête « Découvrir », mais garde le lien Accueil en tête", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			expect(screen.queryByText("Découvrir")).toBeNull();
			expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
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
		/**
		 * Garde du retrait de l'espace client (2026-07-31) : la section ne doit plus
		 * proposer « Se connecter » ni « Créer un compte » à un visiteur. `/connexion`
		 * n'est plus qu'une porte d'administration, joignable par URL directe.
		 */
		it("ne propose ni connexion ni inscription", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
				/>,
			);

			expect(screen.queryByRole("link", { name: "Se connecter" })).toBeNull();
			expect(screen.queryByRole("link", { name: "Créer un compte" })).toBeNull();
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

		/**
		 * Garde du retrait de l'espace client (2026-07-31). Ce test vérifiait qu'on ne
		 * rendait pas DEUX entrées vers `/commandes` (l'entrée « Mon compte » et
		 * « Mes commandes » pointaient toutes deux la même URL). Il n'y a plus aucune
		 * entrée d'espace client à dédupliquer : la section ne porte que les favoris.
		 */
		it("ne rend plus aucune entrée d'espace client", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={session}
				/>,
			);

			expect(screen.queryByRole("link", { name: "Mes commandes" })).not.toBeInTheDocument();
			expect(screen.queryByRole("link", { name: "Mon compte" })).not.toBeInTheDocument();
			expect(screen.queryByRole("link", { name: "Créer un compte" })).not.toBeInTheDocument();
			expect(
				screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/commandes"),
			).toHaveLength(0);
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
