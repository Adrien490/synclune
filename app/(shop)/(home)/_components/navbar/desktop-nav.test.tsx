/**
 * @regression desktop-nav-trigger-link-contract-2026-08-04
 *
 * Verrouille le contrat de clic des triggers du méga-menu (P1 de l'audit navbar
 * 2026-08-04) : les deux entrées principales sont de VRAIS liens (`<a href>` via
 * `render={<Link/>}` + `nativeButton={false}`), Entrée/Espace ouvrent le panneau
 * sans naviguer, un tap tactile ouvre sans naviguer, et un clic souris navigue
 * par l'ancre (⌘-clic, clic milieu, prefetch, LoadingIndicator préservés) en
 * court-circuitant Base UI via `preventBaseUIHandler` — qui ne consulte PAS
 * `defaultPrevented`. Fige aussi la parité survol/focus du SquiggleUnderline et
 * trois classes littérales : toute modification requiert une review explicite.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// Mock next/font/google (imported transitively via barrel → unsaved-changes-dialog → alert-dialog → fonts)
vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return {
		Onest: fontMock,
		Winky_Sans: fontMock,
		Kalam: fontMock,
	};
});

// Mock next/link
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
	useLinkStatus: () => ({ pending: false }),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	usePathname: () => "/produits",
}));

/**
 * Espion du signal Base UI qui court-circuite le gestionnaire interne du trigger.
 *
 * ⚠️ Ce n'est PAS `preventDefault()`. Base UI ne consulte jamais
 * `defaultPrevented` : ses gestionnaires sont fusionnés par `mergeProps`, qui ne
 * les saute que sur `event.preventBaseUIHandler()`. Le mock du trigger reproduit
 * donc ce contrat, sinon le composant lèverait sur une méthode absente.
 */
const preventBaseUIHandler = vi.fn();

// Mock NavigationMenu components to render children directly
vi.mock("@/shared/components/ui/navigation-menu", () => ({
	NavigationMenu: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => <nav {...props}>{children}</nav>,
	NavigationMenuList: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => <ul {...props}>{children}</ul>,
	NavigationMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
	// `renderPropMock` et non `<>{children}</>` : le lien passe désormais par
	// `render={<Link/>}`. Un mock qui ignore `render` fait DISPARAÎTRE l'ancre du
	// DOM, et tous les `getByRole("link")` échouent sans que le composant réel
	// soit en cause (cf. `test/mocks/render-prop.tsx`).
	NavigationMenuLink: (props: RenderPropMockProps) => renderPropMock("a", props),
	/**
	 * ⚠️ Le trigger honore `render`, comme le vrai. Depuis 2026-08-04 il rend un
	 * `<Link>` : un mock qui ignorerait `render` referait un `<button>` sans
	 * `href`, donc verrouillerait précisément le défaut qu'on vient de corriger.
	 *
	 * Il reproduit aussi le couplage `nativeButton` → attribut, lu dans
	 * `@base-ui/react/internals/use-button/useButton.mjs` : `true` spread
	 * `type="button"`, `false` spread `role="button"`. C'est pour ça que le
	 * trigger reste interrogeable en `getByRole("button")` tout en portant un
	 * `href` — l'arbre d'accessibilité réel dit « bouton », le DOM dit « ancre ».
	 */
	NavigationMenuTrigger: ({
		children,
		onClick,
		showChevron: _showChevron,
		nativeButton,
		render,
		...props
	}: RenderPropMockProps & {
		children?: React.ReactNode;
		onClick?: (event: unknown) => void;
		showChevron?: boolean;
		nativeButton?: boolean;
	}) =>
		renderPropMock(nativeButton === false ? "a" : "button", {
			...(nativeButton === false ? { role: "button" } : { type: "button" }),
			...props,
			render,
			children,
			onClick: (event: unknown) => {
				Object.assign(event as object, { preventBaseUIHandler });
				onClick?.(event);
			},
		}),
	NavigationMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	NavigationMenuPopup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
	navigationMenuTriggerStyle: "",
}));

// Mock mega menu sub-components
vi.mock("./mega-menu-creations", () => ({
	MegaMenuCreations: () => <div data-testid="mega-menu-creations" />,
}));

// ⚠️ Plus de mock `./mega-menu-collections` : le bento a été supprimé le
// 2026-08-08 avec les autres surfaces à cartes de collection (à refaire), et
// `DesktopNav` n'a plus qu'une seule branche de panneau.

// Mock useActiveNavbarItem
vi.mock("@/shared/hooks/use-active-navbar-item", () => ({
	useActiveNavbarItem: () => ({
		isMenuItemActive: (href: string) => href === "/produits",
	}),
}));

// Mock useIsTouchDevice — toggled per test to exercise the F3 touch branch
let mockIsTouch = false;
vi.mock("@/shared/hooks/use-touch-device", () => ({
	useIsTouchDevice: () => mockIsTouch,
}));

import { DesktopNav } from "./desktop-nav";

afterEach(() => {
	cleanup();
	mockIsTouch = false;
	preventBaseUIHandler.mockClear();
});

const navItems = [
	{
		href: "/produits",
		label: "Les créations",
		icon: "gem" as const,
		hasDropdown: true,
		dropdownType: "creations" as const,
		children: [
			{ href: "/produits", label: "Toutes les créations", icon: "gem" as const },
			{ href: "/produits/bagues", label: "Bagues" },
		],
	},
	// « Les collections » est un LIEN SIMPLE depuis le 2026-08-08 — pas d'oubli :
	// sans panneau à ouvrir, `hasDropdown` monterait un trigger dont le contenu
	// est vide, et la branche tactile ferait alors ouvrir un panneau blanc au
	// lieu de naviguer. Cf. `getDesktopNavItems`.
	{
		href: "/collections",
		label: "Les collections",
		icon: "folder-open" as const,
	},
	{
		href: "/a-propos",
		label: "L'atelier",
		icon: "info" as const,
	},
];

describe("DesktopNav", () => {
	it("renders all nav items", () => {
		render(<DesktopNav navItems={navItems} />);

		expect(screen.getByText("Les créations")).toBeInTheDocument();
		expect(screen.getByText("Les collections")).toBeInTheDocument();
		expect(screen.getByText("L'atelier")).toBeInTheDocument();
	});

	it("renders simple items as links", () => {
		render(<DesktopNav navItems={navItems} />);

		const link = screen.getByRole("link", { name: "L'atelier" });
		expect(link.getAttribute("href")).toBe("/a-propos");
	});

	it("rend les triggers de mega-menu comme de VRAIS liens porteurs de href", () => {
		render(<DesktopNav navItems={navItems} />);

		// ⚠️ C'est l'assertion centrale du correctif 2026-08-04. Les deux
		// destinations principales du desktop étaient des `<button>` naviguant par
		// `router.push` : ⌘-clic, clic milieu, « Ouvrir dans un nouvel onglet »,
		// « Copier l'adresse du lien », prefetch au survol et `LoadingIndicator`
		// étaient TOUS perdus. Un `href` réel les rend tous les six d'un coup.
		//
		// ⚠️ « Les collections » ne figure plus ici depuis le 2026-08-08 : sans
		// bento, ce n'est plus un trigger mais un lien simple — les six services
		// ci-dessus lui sont acquis par construction. Il est couvert par
		// « rend « Les collections » en lien simple, sans panneau ».
		const creations = screen.getByRole("button", { name: "Les créations" });
		expect(creations.tagName).toBe("A");
		expect(creations.getAttribute("href")).toBe("/produits");
	});

	it("garde le rôle `button` malgré l'ancre — l'annonce suit le CLAVIER, pas le DOM", () => {
		render(<DesktopNav navItems={navItems} />);

		// Ce n'est pas une régression mais la continuité : l'élément ouvrait déjà un
		// panneau sur Entrée quand c'était un `<button>`. Annoncer « lien » ferait
		// promettre une navigation que la touche Entrée ne fait justement pas.
		const creations = screen.getByRole("button", { name: "Les créations" });
		expect(creations.getAttribute("role")).toBe("button");
		expect(creations.getAttribute("type")).toBeNull();
	});

	it("marks the active dropdown trigger with aria-current=page", () => {
		render(<DesktopNav navItems={navItems} />);

		const activeButton = screen.getByRole("button", { name: "Les créations" });
		expect(activeButton.getAttribute("aria-current")).toBe("page");
	});

	it("does not mark inactive items with aria-current", () => {
		render(<DesktopNav navItems={navItems} />);

		const link = screen.getByRole("link", { name: "L'atelier" });
		expect(link.getAttribute("aria-current")).toBeNull();
	});

	it("renders mega menu content for dropdown items", () => {
		render(<DesktopNav navItems={navItems} />);

		expect(screen.getByTestId("mega-menu-creations")).toBeInTheDocument();
	});

	// La contrepartie du retrait du bento : « Les collections » doit rester une
	// destination ATTEIGNABLE, en lien simple et non en trigger sans panneau.
	it("rend « Les collections » en lien simple, sans panneau", () => {
		render(<DesktopNav navItems={navItems} />);

		const link = screen.getByRole("link", { name: "Les collections" });
		expect(link.getAttribute("href")).toBe("/collections");
		expect(screen.queryByRole("button", { name: "Les collections" })).toBeNull();
	});

	describe("keyboard navigation", () => {
		it("does not navigate on Enter key press (Base UI opens the mega menu)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: "Enter" });

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("does not navigate on Space key press (toggles dropdown)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: " " });

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("ANNULE l'action native au clic clavier (detail === 0) et laisse Base UI ouvrir", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			// `fireEvent` rend `false` quand `preventDefault()` a été appelé.
			const notPrevented = fireEvent.click(trigger, { detail: 0 });

			// ⚠️ L'assertion sur `defaultPrevented` est neuve, et elle est le point de
			// bascule du passage en ancre : tant que l'élément était un `<button>`, un
			// simple `return` suffisait à ne pas naviguer. Sur un `<a href>`, ne rien
			// faire laisse la touche Entrée naviguer NATIVEMENT en plus d'ouvrir le
			// panneau — le défaut serait invisible à toute assertion sur `mockPush`.
			expect(notPrevented).toBe(false);
			expect(preventBaseUIHandler).not.toHaveBeenCalled();
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("laisse l'ancre naviguer NATIVEMENT au clic souris, sans router.push", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			const notPrevented = fireEvent.click(trigger, { detail: 1 });

			// L'action par défaut survit : c'est elle qui navigue désormais, et c'est
			// elle qui apporte ⌘-clic, clic milieu et menu contextuel.
			expect(notPrevented).toBe(true);
			// ⚠️ Le signal qui empêche le panneau de s'ouvrir est
			// `preventBaseUIHandler`, PAS `preventDefault` : Base UI ne consulte pas
			// `defaultPrevented`. Et ici les deux ne sont surtout pas interchangeables —
			// `preventDefault()` annulerait la navigation qu'on vient de rétablir.
			expect(preventBaseUIHandler).toHaveBeenCalledTimes(1);
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("n'intercepte RIEN sur ⌘-clic — c'est le navigateur qui ouvre l'onglet", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			const notPrevented = fireEvent.click(trigger, { detail: 1, metaKey: true });

			// Le cas qui motivait tout le lot : avec `router.push`, ⌘-clic naviguait
			// dans l'onglet COURANT, quel que soit le modificateur. Il n'y a rien à
			// coder pour le supporter — il suffit de ne pas voler l'action par défaut.
			expect(notPrevented).toBe(true);
			expect(mockPush).not.toHaveBeenCalled();
		});

		it("does not navigate on touch tap — lets Base UI open the panel (F3)", () => {
			mockIsTouch = true;
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			// Touch tap fires a click with detail >= 1, but on a coarse pointer we must
			// open the mega menu instead of navigating away.
			const notPrevented = fireEvent.click(trigger, { detail: 1 });

			// Même bascule que la branche clavier : sur une ancre il faut ANNULER,
			// plus seulement s'abstenir.
			expect(notPrevented).toBe(false);
			expect(mockPush).not.toHaveBeenCalled();
			expect(preventBaseUIHandler).not.toHaveBeenCalled();
		});

		it("does not navigate on Escape key (Base UI handles menu close)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: "Escape" });

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("does not navigate on ArrowDown (Base UI handles focus shift)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: "ArrowDown" });

			expect(mockPush).not.toHaveBeenCalled();
		});
	});

	describe("habillage Atelier", () => {
		it("compose les libellés en display (font-display) sur les liens comme sur les triggers", () => {
			render(<DesktopNav navItems={navItems} />);

			const link = screen.getByRole("link", { name: "L'atelier" });
			expect(link.className).toContain("font-display");
			const trigger = screen.getByRole("button", { name: "Les créations" });
			expect(trigger.className).toContain("font-display");
		});

		it("renders subtle primary-tinted hover background (gold/rose accent)", () => {
			render(<DesktopNav navItems={navItems} />);
			const link = screen.getByRole("link", { name: "L'atelier" });
			expect(link.className).toContain("hover:bg-primary/8");
		});

		it("remplace le filet de 2px par le trait dessiné à la main, qui répond aussi au focus", () => {
			const { container } = render(<DesktopNav navItems={navItems} />);

			// Le `SquiggleUnderline` est rendu pour chaque entrée. Sa valeur ici n'est
			// pas cosmétique : contrairement au `after:scale-x` qu'il remplace, il se
			// dessine sur `group-focus-within` — parité survol/focus (WCAG 2.4.7).
			const paths = container.querySelectorAll("svg path[stroke-linecap='round']");
			expect(paths.length).toBeGreaterThanOrEqual(navItems.length);
			expect(paths[0]?.getAttribute("class")).toContain("group-focus-within:[stroke-dashoffset:0]");
		});

		it("marque d'un trait déjà dessiné l'entrée correspondant à la page courante", () => {
			render(<DesktopNav navItems={navItems} />);

			// `/produits` est actif (cf. mock de useActiveNavbarItem). Sans l'option
			// `drawn`, remplacer le filet permanent par un trait au survol aurait fait
			// disparaître le repère visuel de `aria-current="page"`.
			const activeTrigger = screen.getByRole("button", { name: "Les créations" });
			const activePath = activeTrigger.querySelector("svg path");
			expect(activePath?.getAttribute("class")).toContain("[stroke-dashoffset:0]");

			// Le témoin inactif est « Les collections », devenue un LIEN simple le
			// 2026-08-08 (bento supprimé) : le trait doit rester au repos sur les
			// deux branches de rendu de `DesktopNav`, pas seulement sur les triggers.
			const inactiveLink = screen.getByRole("link", { name: "Les collections" });
			const inactivePath = inactiveLink.querySelector("svg path");
			expect(inactivePath?.getAttribute("class")).toContain("[stroke-dashoffset:120]");
		});
	});
});
