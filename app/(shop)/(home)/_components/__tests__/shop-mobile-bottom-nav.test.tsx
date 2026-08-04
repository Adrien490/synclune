import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactDomModule from "react-dom";

import { lastTrigger } from "@/modules/products/components/quick-search-dialog/last-trigger";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockIsRouteActive,
	mockIsCatalogueRoute,
	mockTriggerHaptic,
	mockUseMounted,
	mockUseDialog,
	mockUsePathname,
	mockOpenSheet,
	mockOpenDialog,
	mockSheetState,
	mockBadgeState,
} = vi.hoisted(() => ({
	mockIsRouteActive: vi.fn(),
	mockIsCatalogueRoute: vi.fn(),
	mockTriggerHaptic: vi.fn(),
	mockUseMounted: vi.fn(),
	mockUseDialog: vi.fn(),
	mockUsePathname: vi.fn(),
	mockOpenSheet: vi.fn(),
	mockOpenDialog: vi.fn(),
	// Mutables : `openSheet` pilote `aria-expanded` de l'onglet Panier, et les
	// compteurs pilotent les noms accessibles des onglets Panier / Favoris.
	mockSheetState: { openSheet: null as string | null },
	mockBadgeState: { cartCount: 0, wishlistCount: 0, cartBump: null as null },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("react-dom", async () => {
	const actual = await vi.importActual<typeof ReactDomModule>("react-dom");
	return { ...actual, createPortal: (children: React.ReactNode) => children };
});

vi.mock("next/navigation", () => ({ usePathname: mockUsePathname }));

vi.mock("@/shared/lib/navigation", () => ({
	isRouteActive: mockIsRouteActive,
	isCatalogueRoute: mockIsCatalogueRoute,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({ triggerHaptic: mockTriggerHaptic }));

vi.mock("@/shared/hooks/use-mounted", () => ({ useMounted: mockUseMounted }));

vi.mock("@/shared/providers/dialog-store-provider", () => ({ useDialog: mockUseDialog }));

vi.mock("@/shared/providers/sheet-store-provider", () => ({
	useSheetStore: (selector: (s: { open: unknown; openSheet: string | null }) => unknown) =>
		selector({ open: mockOpenSheet, openSheet: mockSheetState.openSheet }),
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (
		selector: (s: { cartCount: number; wishlistCount: number; cartBump: null }) => unknown,
	) => selector(mockBadgeState),
}));

vi.mock("@/shared/components/bottom-bar", () => ({
	BottomBar: ({ children, ...props }: { children: React.ReactNode }) => (
		<nav {...props}>{children}</nav>
	),
	bottomBarContainerClass: "container",
	bottomBarItemWrapperClass: "item-wrapper",
	bottomBarItemClass: "item",
	bottomBarActiveItemClass: "active",
	bottomBarIconClass: "icon",
	bottomBarLabelClass: "label",
}));

vi.mock("@/shared/components/ui/count-badge", () => ({ CountBadge: () => null }));

vi.mock("@/shared/components/navigation/loading-indicator", () => ({
	LoadingIndicator: () => null,
}));

const { ShopMobileBottomNav } = await import("../shop-mobile-bottom-nav");

describe("ShopMobileBottomNav", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		lastTrigger.el = null;
		mockUseMounted.mockReturnValue(true);
		mockUsePathname.mockReturnValue("/");
		mockIsRouteActive.mockReturnValue(false);
		mockUseDialog.mockReturnValue({ open: mockOpenDialog, isOpen: false });
		mockSheetState.openSheet = null;
		mockBadgeState.cartCount = 0;
		mockBadgeState.wishlistCount = 0;
	});

	afterEach(cleanup);

	/**
	 * L'onglet à la loupe était un `<Link>` vers /produits : la seule affordance
	 * « recherche » de la zone du pouce n'ouvrait pas la recherche.
	 */
	it("expose la recherche comme un bouton, pas comme un lien", () => {
		render(<ShopMobileBottomNav />);

		const searchTab = screen.getByRole("button", { name: "Rechercher" });
		expect(searchTab).toHaveAttribute("aria-haspopup", "dialog");
		expect(searchTab).toHaveAttribute("aria-expanded", "false");
		// Aucun onglet ne doit être un lien nommé « Rechercher ».
		expect(screen.queryByRole("link", { name: /rechercher/i })).not.toBeInTheDocument();
	});

	it("ouvre le dialog de recherche rapide au clic", () => {
		render(<ShopMobileBottomNav />);

		fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

		expect(mockOpenDialog).toHaveBeenCalledTimes(1);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
	});

	/**
	 * Contrat `lastTrigger` : sans ce handoff, `onCloseAutoFocus` du dialog
	 * refocalise un élément périmé et le focus tombe sur <body>.
	 */
	it("enregistre le bouton comme dernier déclencheur pour la restauration du focus", () => {
		render(<ShopMobileBottomNav />);

		const searchTab = screen.getByRole("button", { name: "Rechercher" });
		fireEvent.click(searchTab);

		expect(lastTrigger.el).toBe(searchTab);
	});

	it("reflète l'ouverture du dialog via aria-expanded", () => {
		mockUseDialog.mockReturnValue({ open: mockOpenDialog, isOpen: true });
		render(<ShopMobileBottomNav />);

		expect(screen.getByRole("button", { name: "Rechercher" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	});

	it("garde le panier en bouton et les autres onglets en liens", () => {
		render(<ShopMobileBottomNav />);

		expect(screen.getByRole("button", { name: /panier/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /accueil/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /favoris/i })).toBeInTheDocument();
	});

	it("n'ouvre pas la recherche quand on tape sur le panier", () => {
		render(<ShopMobileBottomNav />);

		fireEvent.click(screen.getByRole("button", { name: /panier/i }));

		expect(mockOpenSheet).toHaveBeenCalledWith("cart");
		expect(mockOpenDialog).not.toHaveBeenCalled();
	});

	describe("accessibilité des onglets à dialogue et des compteurs", () => {
		/**
		 * Régression : `isActive: false` était un littéral, donc `aria-expanded`
		 * restait "false" panier ouvert, sur un bouton `aria-haspopup="dialog"`
		 * (WCAG 4.1.2). L'onglet Rechercher, lui, était correct.
		 */
		it("l'onglet Panier reflète l'ouverture du sheet dans aria-expanded", () => {
			mockSheetState.openSheet = "cart";
			render(<ShopMobileBottomNav />);

			expect(screen.getByRole("button", { name: /panier/i })).toHaveAttribute(
				"aria-expanded",
				"true",
			);
		});

		it("l'onglet Panier reste replié quand un AUTRE sheet est ouvert", () => {
			mockSheetState.openSheet = "filters";
			render(<ShopMobileBottomNav />);

			expect(screen.getByRole("button", { name: /panier/i })).toHaveAttribute(
				"aria-expanded",
				"false",
			);
		});

		/**
		 * Régression : `CountBadge` est `aria-hidden` ET la bottom bar passe
		 * `silentLiveRegion`, la live region combinée sautant le premier rendu. Un
		 * lecteur d'écran parcourant la barre n'entendait donc jamais les compteurs.
		 */
		it("le nom accessible du Panier porte le nombre d'articles", () => {
			mockBadgeState.cartCount = 3;
			render(<ShopMobileBottomNav />);

			expect(screen.getByRole("button", { name: "Panier, 3 articles" })).toBeInTheDocument();
		});

		it("singularise le compteur du Panier", () => {
			mockBadgeState.cartCount = 1;
			render(<ShopMobileBottomNav />);

			expect(screen.getByRole("button", { name: "Panier, 1 article" })).toBeInTheDocument();
		});

		/** Le badge Favoris est un `type: "dot"` : sans libellé, le nombre n'existe nulle part. */
		it("le nom accessible des Favoris porte le nombre, invisible car badge en pastille", () => {
			mockBadgeState.wishlistCount = 2;
			render(<ShopMobileBottomNav />);

			expect(screen.getByRole("link", { name: "Favoris, 2 favoris" })).toBeInTheDocument();
		});

		it("n'ajoute aucun compteur au nom accessible quand il vaut 0", () => {
			render(<ShopMobileBottomNav />);

			expect(screen.getByRole("button", { name: "Panier" })).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Favoris" })).toBeInTheDocument();
		});
	});

	// Audit bottom-bar 2026-07-30, P3.
	describe("structure de liste et haptique", () => {
		/**
		 * Quatre liens/boutons frères dans un `<nav>` ne disent pas « 4 éléments » à un
		 * lecteur d'écran. Le `<li>` doit porter le conteneur flex, sinon le `flex-1`
		 * de l'onglet n'a plus rien à quoi s'appliquer et les onglets ne se
		 * répartissent plus la largeur.
		 *
		 * 5 → 4 au retrait de l'espace client (2026-07-31) : l'onglet « Compte » n'a
		 * plus de destination. 4 → 5 à la refonte « L'intercalaire » (2026-08-04) :
		 * ajout de « Créations », sans quoi aucun onglet ne représentait le catalogue.
		 */
		it("expose les onglets comme une liste", () => {
			render(<ShopMobileBottomNav />);

			const list = screen.getByRole("list");
			const items = screen.getAllByRole("listitem");
			expect(items).toHaveLength(5);
			for (const item of items) {
				expect(item.parentElement).toBe(list);
				expect(item.className).toContain("item-wrapper");
			}
		});

		/**
		 * Le P1 de l'audit design du 2026-08-04 : sur `/produits`, `/creations/*` et
		 * `/collections/*`, AUCUN onglet n'était marqué courant — la barre ne
		 * répondait jamais à « où suis-je » sur les pages où la cliente passe le plus
		 * de temps. Le prédicat vit dans `isCatalogueRoute`, partagé avec la nav.
		 */
		it("l'onglet Créations est courant sur tout le rayon catalogue", () => {
			mockIsCatalogueRoute.mockReturnValue(true);
			render(<ShopMobileBottomNav />);

			const tab = screen.getByRole("link", { name: "Créations" });
			expect(tab).toHaveAttribute("aria-current", "page");
			expect(tab).toHaveAttribute("href", "/produits");
		});

		it("l'onglet Créations n'est PAS courant hors catalogue", () => {
			mockIsCatalogueRoute.mockReturnValue(false);
			render(<ShopMobileBottomNav />);

			expect(screen.getByRole("link", { name: "Créations" })).not.toHaveAttribute("aria-current");
		});

		/**
		 * Les onglets-LIENS n'émettaient aucun haptique là où les onglets-boutons en
		 * émettaient : un tap sur Accueil/Favoris était muet, un tap sur
		 * Recherche/Panier non. La règle projet garde « bottom nav tab change » en
		 * `selection`.
		 */
		it("déclenche haptic « selection » au tap d'un onglet-lien inactif", () => {
			render(<ShopMobileBottomNav />);

			fireEvent.click(screen.getByRole("link", { name: "Favoris" }));

			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it("ne déclenche pas d'haptique sur un onglet-lien déjà actif", () => {
			mockIsRouteActive.mockReturnValue(true);
			render(<ShopMobileBottomNav />);

			fireEvent.click(screen.getByRole("link", { name: "Favoris" }));

			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});

		/**
		 * Garde du retrait (2026-07-31) : l'onglet « Compte » ne doit pas revenir.
		 *
		 * Il menait à `/commandes` pour une session et à `/connexion` sinon — deux
		 * destinations supprimées côté client. Le remettre re-créerait un cul-de-sac
		 * dans la zone du pouce, l'endroit le plus coûteux pour un lien mort.
		 */
		it("n'expose plus d'onglet Compte", () => {
			render(<ShopMobileBottomNav />);

			expect(screen.queryByRole("link", { name: "Compte" })).toBeNull();
			expect(screen.queryByRole("link", { name: /connexion|connecter/i })).toBeNull();
		});

		it("expose exactement Accueil, Recherche, Favoris et Panier", () => {
			render(<ShopMobileBottomNav />);

			expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Rechercher" })).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Favoris" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Panier" })).toBeInTheDocument();
		});
	});
});
