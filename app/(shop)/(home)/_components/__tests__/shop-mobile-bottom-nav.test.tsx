import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactDomModule from "react-dom";

import { lastTrigger } from "@/modules/products/components/quick-search-dialog/last-trigger";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockIsRouteActive,
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

vi.mock("@/shared/lib/navigation", () => ({ isRouteActive: mockIsRouteActive }));

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
	BottomBarActivePill: () => null,
	bottomBarContainerClass: "container",
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
		render(<ShopMobileBottomNav isAuthenticated={false} />);

		const searchTab = screen.getByRole("button", { name: "Rechercher" });
		expect(searchTab).toHaveAttribute("aria-haspopup", "dialog");
		expect(searchTab).toHaveAttribute("aria-expanded", "false");
		// Aucun onglet ne doit être un lien nommé « Rechercher ».
		expect(screen.queryByRole("link", { name: /rechercher/i })).not.toBeInTheDocument();
	});

	it("ouvre le dialog de recherche rapide au clic", () => {
		render(<ShopMobileBottomNav isAuthenticated={false} />);

		fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

		expect(mockOpenDialog).toHaveBeenCalledTimes(1);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
	});

	/**
	 * Contrat `lastTrigger` : sans ce handoff, `onCloseAutoFocus` du dialog
	 * refocalise un élément périmé et le focus tombe sur <body>.
	 */
	it("enregistre le bouton comme dernier déclencheur pour la restauration du focus", () => {
		render(<ShopMobileBottomNav isAuthenticated={false} />);

		const searchTab = screen.getByRole("button", { name: "Rechercher" });
		fireEvent.click(searchTab);

		expect(lastTrigger.el).toBe(searchTab);
	});

	it("reflète l'ouverture du dialog via aria-expanded", () => {
		mockUseDialog.mockReturnValue({ open: mockOpenDialog, isOpen: true });
		render(<ShopMobileBottomNav isAuthenticated={false} />);

		expect(screen.getByRole("button", { name: "Rechercher" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	});

	it("garde le panier en bouton et les autres onglets en liens", () => {
		render(<ShopMobileBottomNav isAuthenticated={false} />);

		expect(screen.getByRole("button", { name: /panier/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /accueil/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /favoris/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /compte/i })).toBeInTheDocument();
	});

	it("n'ouvre pas la recherche quand on tape sur le panier", () => {
		render(<ShopMobileBottomNav isAuthenticated={false} />);

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
			render(<ShopMobileBottomNav isAuthenticated={false} />);

			expect(screen.getByRole("button", { name: /panier/i })).toHaveAttribute(
				"aria-expanded",
				"true",
			);
		});

		it("l'onglet Panier reste replié quand un AUTRE sheet est ouvert", () => {
			mockSheetState.openSheet = "filters";
			render(<ShopMobileBottomNav isAuthenticated={false} />);

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
			render(<ShopMobileBottomNav isAuthenticated={false} />);

			expect(screen.getByRole("button", { name: "Panier, 3 articles" })).toBeInTheDocument();
		});

		it("singularise le compteur du Panier", () => {
			mockBadgeState.cartCount = 1;
			render(<ShopMobileBottomNav isAuthenticated={false} />);

			expect(screen.getByRole("button", { name: "Panier, 1 article" })).toBeInTheDocument();
		});

		/** Le badge Favoris est un `type: "dot"` : sans libellé, le nombre n'existe nulle part. */
		it("le nom accessible des Favoris porte le nombre, invisible car badge en pastille", () => {
			mockBadgeState.wishlistCount = 2;
			render(<ShopMobileBottomNav isAuthenticated={false} />);

			expect(screen.getByRole("link", { name: "Favoris, 2 favoris" })).toBeInTheDocument();
		});

		it("n'ajoute aucun compteur au nom accessible quand il vaut 0", () => {
			render(<ShopMobileBottomNav isAuthenticated={false} />);

			expect(screen.getByRole("button", { name: "Panier" })).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Favoris" })).toBeInTheDocument();
		});
	});
});
