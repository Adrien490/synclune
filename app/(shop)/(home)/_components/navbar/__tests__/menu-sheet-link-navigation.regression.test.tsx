/**
 * @regression menu-sheet-link-history-back-race-2026-07-26
 *
 * Bug : chaque entrée de navigation du menu sheet storefront était rendue dans
 * `<SheetClose asChild><Link>`. Le Slot Radix fait atterrir le `onClick` de
 * `SheetClose` sur le `<Link>`, et Next l'invoque AVANT `linkClicked` :
 *
 *   tap → SheetClose.onClick → Vaul `onOpenChange(false)`
 *       → `wrappedOnOpenChange` (shared/components/ui/sheet.tsx)
 *       → `useBackButtonClose.handleClose()` → `history.back()` **synchrone**
 *       → puis seulement `linkClicked` → `router.push`
 *
 * Le `back()` race le `push` et annule la navigation : l'utilisateur reste sur
 * la même page après tap, sans erreur. C'est le bug déjà verrouillé pour
 * `ResponsiveActionMenu` (`link-history-back.regression.test.tsx`, 2026-05-15) ;
 * il vivait encore ici sur les 4 sites de liens du menu.
 *
 * La garde `isTopOfHistory` de `use-back-button-close` ne couvre PAS ce cas :
 * elle compare `history.length` à sa valeur au moment du push, ce qui détecte
 * « un `router.push` a eu lieu PENDANT l'ouverture », pas « le push est queué
 * dans le même clic, après `handleClose` » — à cet instant la longueur est
 * encore intacte, donc la garde conclut « je suis au sommet » et recule.
 *
 * Fix : les liens ne passent plus par `SheetClose`. Ils appellent le handler du
 * `MenuSheetNavigateContext`, qui ferme via la prop contrôlée (`open={isOpen}`)
 * sans repasser par `onOpenChange` de Vaul — donc sans `history.back()`. Ils
 * naviguent en `replace` pour consommer l'entrée d'historique poussée à
 * l'ouverture, plutôt que de l'enterrer (sinon : une pression de retour morte
 * par cycle ouvrir → naviguer, cumulative).
 *
 * Garde-fou : ce test monte le **vrai** `@/shared/components/ui/sheet`. Le mock
 * intégral de `menu-sheet.test.tsx` est précisément ce qui rendait la suite
 * aveugle à cette chaîne — ne pas le reproduire ici.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockHandleClose = vi.fn();
const mockHistoryBack = vi.fn();
const mockCloseDialog = vi.fn();

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-edge-swipe", () => ({ useEdgeSwipe: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

// `replace` n'apparaît pas sur l'ancre rendue par le vrai `next/link` : on le
// projette en `data-replace` pour pouvoir l'asserter. `onClick` est préservé —
// c'est lui qui porte la régression.
vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		replace,
		prefetch: _prefetch,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: (e: React.MouseEvent) => void;
		replace?: boolean;
		prefetch?: boolean | null;
	} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a href={href} onClick={onClick} data-replace={String(Boolean(replace))} {...rest}>
			{children}
		</a>
	),
}));

// Le sheet est contrôlé et OUVERT : on veut que le contenu (donc les liens) soit
// monté par le portail Vaul.
vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({
		isOpen: true,
		data: undefined,
		open: vi.fn(),
		close: mockCloseDialog,
		toggle: vi.fn(),
		clearData: vi.fn(),
	}),
	useSheetStore: (selector: (s: { open: (id: string) => void }) => unknown) =>
		selector({ open: vi.fn() }),
}));

// Hors sujet ici (le raccourci Panier est un <button>, pas un lien) mais requis
// au montage : `MenuSheet` lit le sheet-store pour le différé cart.

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (s: Record<string, number>) => unknown) =>
		selector({ cartCount: 0, wishlistCount: 0 }),
}));

vi.mock("@/shared/hooks/use-active-navbar-item", () => ({
	useActiveNavbarItem: () => ({ isMenuItemActive: () => false }),
}));

vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: () => null,
}));

// Spy sur la chaîne incriminée : `handleClose` est ce que `wrappedOnOpenChange`
// appelle, et c'est lui qui déclenche `history.back()`.
vi.mock("@/shared/hooks/use-back-button-close", () => ({
	useBackButtonClose: () => ({
		handleClose: () => {
			mockHandleClose();
			mockHistoryBack();
		},
	}),
	isOverlayInitiatedPop: () => false,
}));

import { MenuSheet } from "../menu-sheet";

const NAV_ITEMS = [
	{ href: "/", label: "Accueil", icon: "home" as const },
	{ href: "/commandes", label: "Mon compte", icon: "user" as const },
	{ href: "/favoris", label: "Mes favoris", icon: "heart" as const },
];

function renderOpenMenu() {
	return render(
		<MenuSheet
			navItems={NAV_ITEMS}
			productTypes={[{ slug: "bagues", label: "Bagues" }]}
			isAdmin={false}
			session={null}
		/>,
	);
}

beforeEach(() => {
	mockHandleClose.mockClear();
	mockHistoryBack.mockClear();
	mockCloseDialog.mockClear();
});

afterEach(() => {
	cleanup();
});

describe("MenuSheet — navigation des liens (regression locked)", () => {
	it("aucun lien de navigation n'est enveloppé dans un SheetClose", () => {
		renderOpenMenu();

		const links = screen.getAllByRole("link");
		expect(links.length).toBeGreaterThan(2);

		for (const link of links) {
			// Marqueur migré : Vaul posait `data-vaul-drawer-close` sur son wrapper,
			// Base UI ne pose rien — c'est notre `data-slot` qui identifie le Close.
			let node: HTMLElement | null = link;
			while (node) {
				expect(node.getAttribute("data-slot")).not.toBe("sheet-close");
				node = node.parentElement;
			}
		}
	});

	it("un tap sur une entrée ferme via la prop contrôlée, PAS via history.back()", () => {
		renderOpenMenu();

		fireEvent.click(screen.getByRole("link", { name: "Bagues" }));

		expect(mockCloseDialog).toHaveBeenCalled();
		// Le cœur de la régression : la chaîne Vaul → handleClose → history.back()
		// ne doit jamais être empruntée par un tap de lien.
		expect(mockHandleClose).not.toHaveBeenCalled();
		expect(mockHistoryBack).not.toHaveBeenCalled();
	});

	it("TOUS les liens naviguent en replace (consomme l'entrée d'historique du sheet)", () => {
		renderOpenMenu();

		const links = screen.getAllByRole("link");
		// Les liens sociaux du footer sortent du site (target=_blank) : hors périmètre.
		const internalLinks = links.filter((l) => !l.getAttribute("target"));
		expect(internalLinks.length).toBeGreaterThan(2);

		for (const link of internalLinks) {
			expect(link).toHaveAttribute("data-replace", "true");
		}
	});

	it("le lien de marque du header respecte la cible tactile de 44px (WCAG 2.5.5)", () => {
		renderOpenMenu();

		// Libellé issu du gabarit unique `brandLinkLabel()` (`shared/components/logo`).
		// Il valait « Synclune - Retour à l'accueil » tant que le panneau écrivait son
		// propre nom accessible ; c'est cette divergence que le lot 0.2 a fermée.
		const brand = screen.getByRole("link", { name: "Synclune - Accueil" });
		expect(brand.className).toContain("min-h-11");
	});
});
