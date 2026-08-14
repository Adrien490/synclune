import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

// Mock next/image — la grille rend des vignettes `fill`
vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="tile-image" />
	),
}));

// Mock SheetClose to render children directly
vi.mock("@/shared/components/ui/sheet", () => ({
	SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock CountBadge — shortcuts band uses the SSOT CountBadge (dot pour les
// favoris, count pour le panier).
vi.mock("@/shared/components/ui/count-badge", () => ({
	CountBadge: ({ count }: { count: number }) =>
		count > 0 ? <span data-testid="count-badge">{count}</span> : null,
}));

// Mock LogoutAlertDialog
vi.mock("@/modules/admin-auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./menu-sheet-nav-sections", async (importOriginal) => {
	const original = (await importOriginal()) as Record<string, unknown>;
	return {
		...original,
		UserHeader: () => <div data-testid="user-header" />,
	};
});

// Mock hooks — prédicat réassignable par test (cas « entrée active » du focus).
// Lu à l'appel, jamais à l'évaluation du factory : pas de souci de hoisting.
let mockIsMenuItemActive: (href: string) => boolean = () => false;
vi.mock("@/shared/hooks/use-active-navbar-item", () => ({
	useActiveNavbarItem: () => ({
		isMenuItemActive: (href: string) => mockIsMenuItemActive(href),
	}),
}));

const mockStore = { wishlistCount: 2, cartCount: 1 };
vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

import { MenuSheetNav } from "./menu-sheet-nav";

afterEach(() => {
	cleanup();
	mockIsMenuItemActive = () => false;
});

const productTypes = [
	{
		slug: "bagues",
		label: "Bagues",
		productCount: 4,
		image: { url: "/bague.jpg", blurDataUrl: null },
	},
	{ slug: "colliers", label: "Colliers", productCount: 2, image: null },
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

function renderNav(props: Partial<React.ComponentProps<typeof MenuSheetNav>> = {}) {
	return render(<MenuSheetNav navItems={baseNavItems} productTypes={productTypes} {...props} />);
}

describe("MenuSheetNav", () => {
	describe("sections — l'étal de poche", () => {
		it("renders the editorial head note, creations grid and collections row", () => {
			renderNav();

			// Tête éditoriale greffée de la direction C — copie statique.
			expect(
				screen.getByText("Chaque pièce est faite à la main, dans mon atelier."),
			).toBeInTheDocument();
			// « Mes créations » (première personne) et non « Nos créations » —
			// pluriel d'entreprise banni, une seule créatrice.
			expect(screen.getByText("Mes créations")).toBeInTheDocument();
			expect(screen.queryByText("Nos créations")).toBeNull();
			// ⚠️ Plus d'intertitre « Collections » : la bande de trois tirages a été
			// supprimée le 2026-08-08 (à refaire). La salle n'est plus qu'une rangée
			// pleine largeur — mais elle DOIT rester présente : c'est le seul lien
			// vers /collections sous `lg`.
			expect(screen.queryByText("Collections")).toBeNull();
			expect(screen.getByRole("link", { name: "Les collections" }).getAttribute("href")).toBe(
				"/collections",
			);
		});

		it("expose la bande « Accès rapide » : Accueil, Favoris, Panier", () => {
			renderNav();

			expect(screen.getByRole("region", { name: "Accès rapide" })).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
			// Le compteur passe par le nom accessible (le badge `dot` est muet).
			expect(screen.getByRole("link", { name: "Favoris, 2 favoris" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /Panier/ })).toBeInTheDocument();
		});

		it("le raccourci Panier est un bouton aria-haspopup qui délègue à onCartClick", () => {
			const onCartClick = vi.fn();
			renderNav({ onCartClick });

			const cartButton = screen.getByRole("button", { name: /Panier/ });
			expect(cartButton.getAttribute("aria-haspopup")).toBe("dialog");
			fireEvent.click(cartButton);
			expect(onCartClick).toHaveBeenCalledTimes(1);
		});

		// "L'atelier" (ROUTES.SHOP.ABOUT) retiré temporairement de getMobileNavItems
		// (à réintégrer plus tard) → ne doit plus apparaître dans le menu mobile.
		it("does not render the 'L'atelier' link", () => {
			renderNav();

			expect(screen.queryByRole("link", { name: "L'atelier" })).toBeNull();
		});

		it("renders product type tiles using ROUTES, avec le compte de pièces dans le nom accessible", () => {
			renderNav();

			// Le compte visible est aria-hidden ; il est replié dans l'aria-label du
			// lien pour ne pas casser le nom accessible d'un retour à la ligne.
			const baguesLink = screen.getByRole("link", { name: "Bagues, 4 pièces" });
			expect(baguesLink.getAttribute("href")).toBe("/produits/bagues");

			const colliersLink = screen.getByRole("link", { name: "Colliers, 2 pièces" });
			expect(colliersLink.getAttribute("href")).toBe("/produits/colliers");
		});

		it("rend la tuile « Voir tout » vers /produits (remplace « Tous les bijoux »)", () => {
			renderNav();

			expect(screen.queryByRole("link", { name: "Tous les bijoux" })).toBeNull();
			const viewAll = screen.getByRole("link", { name: "Voir tout" });
			expect(viewAll.getAttribute("href")).toBe("/produits");
		});

		/**
		 * ⚠️ Le test qui vivait ici vérifiait les cartes de collection ET le lien
		 * « Toutes les collections » de la bande, supprimés le 2026-08-08. Ce qu'il
		 * protégeait vraiment — que la salle Collections reste JOIGNABLE depuis le
		 * volet — est repris dans le premier test de ce bloc, sur la rangée qui l'a
		 * remplacée. Ne pas le rouvrir sans rendu de collection en face.
		 */

		it("affiche l'encart « L'atelier est en pause » quand aucune famille n'est publiée", () => {
			renderNav({ productTypes: [] });

			expect(screen.getByText("L'atelier est en pause")).toBeInTheDocument();
			expect(screen.getByText(/Je remets des pièces en ligne très vite/)).toBeInTheDocument();
			expect(screen.queryByRole("link", { name: "Voir tout" })).toBeNull();
		});
	});

	describe("focus management", () => {
		// @regression menu-mobile-focus-preventscroll
		// applyFocus() centre l'entrée active puis focalise (l'entrée active, ou le
		// premier lien à défaut). Sans preventScroll, focus() re-défile et annule le
		// centrage — l'élément focalisé, quel qu'il soit, doit passer
		// { preventScroll: true }.
		it("focuses the first nav link with preventScroll when nothing is active", () => {
			const focusSpy = vi.spyOn(HTMLAnchorElement.prototype, "focus");
			try {
				renderNav();

				expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
			} finally {
				focusSpy.mockRestore();
			}
		});

		// L'entrée active reçoit le focus ELLE-MÊME (audit menu-sheet 2026-08-05) :
		// scrollIntoView la centre, et un focus posé sur le premier lien vivait
		// hors-écran dès qu'elle était sous le pli — le premier Tab re-défilait
		// alors vers le haut, défaisant le scroll-to-active pour le clavier.
		it("focuses the active entry itself when one exists", () => {
			// jsdom n'implémente pas scrollIntoView (appelé dès qu'une entrée est active).
			window.HTMLElement.prototype.scrollIntoView = vi.fn();
			mockIsMenuItemActive = (href) => href === "/produits/bagues";
			renderNav();

			expect(document.activeElement).toBe(screen.getByRole("link", { name: "Bagues, 4 pièces" }));
		});
	});

	describe("logged out", () => {
		/**
		 * Garde du retrait de l'espace client (2026-07-31) : le menu ne doit plus
		 * proposer « Se connecter » ni « Créer un compte » à un visiteur. `/connexion`
		 * n'est plus qu'une porte d'administration, joignable par URL directe.
		 */
		it("ne propose ni connexion ni inscription", () => {
			renderNav();

			expect(screen.queryByRole("link", { name: "Se connecter" })).toBeNull();
			expect(screen.queryByRole("link", { name: "Créer un compte" })).toBeNull();
		});

		it("does not render user header", () => {
			renderNav();

			expect(screen.queryByTestId("user-header")).toBeNull();
		});

		it("rend le raccourci Favoris même sans session (parité bottom bar / navbar)", () => {
			renderNav();

			expect(screen.getByRole("link", { name: /Favoris/ })).toBeInTheDocument();
		});
	});

	describe("admin", () => {
		it("renders wishlist AND cart badges in the shortcuts band", () => {
			renderNav({ isAdmin: true });

			// Deux badges : le dot des favoris (2) et le compteur du panier (1).
			const badges = screen.getAllByTestId("count-badge");
			expect(badges.map((b) => b.textContent).sort()).toEqual(["1", "2"]);
		});

		it("renders the logout button", () => {
			renderNav({ isAdmin: true });

			expect(screen.getByRole("button", { name: "Déconnexion" })).toBeInTheDocument();
		});

		/**
		 * Garde du retrait de l'espace client (2026-07-31). Ce test vérifiait qu'on ne
		 * rendait pas DEUX entrées vers `/commandes`. Il n'y a plus aucune entrée
		 * d'espace client à dédupliquer.
		 */
		it("ne rend plus aucune entrée d'espace client", () => {
			renderNav({ isAdmin: true });

			expect(screen.queryByRole("link", { name: "Mes commandes" })).not.toBeInTheDocument();
			expect(screen.queryByRole("link", { name: "Mon compte" })).not.toBeInTheDocument();
			expect(screen.queryByRole("link", { name: "Créer un compte" })).not.toBeInTheDocument();
			expect(
				screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/commandes"),
			).toHaveLength(0);
		});
	});
});
