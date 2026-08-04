import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks (vi.mock factories are hoisted above variable declarations)
const {
	useReducedMotionMock,
	useBottomBarHeightMock,
	useKeyboardOpenMock,
	useMediaQueryMock,
	animationComplete,
} = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn(() => false),
	useBottomBarHeightMock: vi.fn(),
	useKeyboardOpenMock: vi.fn(() => false),
	// Défaut : viewport sous le breakpoint → la barre est visible.
	useMediaQueryMock: vi.fn(() => true),
	// Dernier `onAnimationComplete` rendu, pour piloter la fin du slide-out.
	animationComplete: { current: null as (() => void) | null },
}));

// Mock cn utility
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock motion/react — render plain elements while forwarding `layoutId` and
// `transition` as data-attrs so tests can assert pill morphing wiring.
vi.mock("motion/react", async () => {
	const { createElement } = await import("react");

	const makeStub =
		(tag: string) =>
		({
			layoutId,
			transition,
			initial,
			animate,
			onAnimationComplete,
			...rest
		}: Record<string, unknown> & { children?: React.ReactNode }) => {
			const extras: Record<string, string> = {};
			if (layoutId !== undefined) extras["data-layout-id"] = String(layoutId);
			if (transition !== undefined) extras["data-transition"] = JSON.stringify(transition);
			if (initial !== undefined) extras["data-initial"] = JSON.stringify(initial);
			if (animate !== undefined) extras["data-animate"] = JSON.stringify(animate);
			// Capturé plutôt que spreadé : `on*` inconnu sur un noeud DOM déclenche un
			// warning React, et les tests du slide-out différé ont besoin de l'appeler.
			if (typeof onAnimationComplete === "function") {
				animationComplete.current = onAnimationComplete as () => void;
			}
			return createElement(tag, { ...rest, ...extras });
		};

	return {
		useReducedMotion: useReducedMotionMock,
		motion: {
			div: makeStub("div"),
			nav: makeStub("nav"),
		},
		m: new Proxy(
			{},
			{
				get: (_target, prop) => {
					if (typeof prop === "symbol") return undefined;
					return makeStub(String(prop));
				},
			},
		),
	};
});

// Mock useBottomBarHeight to track calls
vi.mock("@/shared/hooks", () => ({
	useBottomBarHeight: useBottomBarHeightMock,
}));

// Mock useMediaQuery — pilote la visibilité réelle de la barre.
vi.mock("@/shared/hooks/use-media-query", () => ({
	useMediaQuery: useMediaQueryMock,
}));

// Mock soft-keyboard observer — controllable per test.
vi.mock("@/shared/components/visual-viewport-bridge", () => ({
	useKeyboardOpen: useKeyboardOpenMock,
}));

// Mock motion config
vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		spring: {
			bar: { damping: 25, stiffness: 300 },
			snappy: { damping: 35, stiffness: 500, mass: 0.3 },
		},
	},
}));

import { BottomBar } from "../bottom-bar";
import {
	bottomBarContainerClass,
	bottomBarItemWrapperClass,
	bottomBarItemClass,
	bottomBarActiveItemClass,
	bottomBarIconClass,
	bottomBarLabelClass,
	bottomBarBadgeClass,
} from "../bottom-bar.styles";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	animationComplete.current = null;
});

/** Dernier appel au hook de hauteur, sous sa forme `(ref, options)`. */
function lastHeightCall() {
	const call = useBottomBarHeightMock.mock.calls.at(-1) as
		[{ current: HTMLElement | null }, { fallback: number; enabled: boolean }] | undefined;
	return { ref: call?.[0], options: call?.[1] };
}

// ---------------------------------------------------------------------------
// BottomBar
// ---------------------------------------------------------------------------

describe("BottomBar", () => {
	it("renders children", () => {
		render(
			<BottomBar>
				<span data-testid="child">Hello</span>
			</BottomBar>,
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("renders as div by default", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.tagName).toBe("DIV");
	});

	it('renders as nav when as="nav"', () => {
		render(
			<BottomBar as="nav" aria-label="navigation">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("navigation");
		expect(el.tagName).toBe("NAV");
	});

	it("applies aria-label", () => {
		render(
			<BottomBar aria-label="test label">
				<span>content</span>
			</BottomBar>,
		);

		expect(screen.getByLabelText("test label")).toBeInTheDocument();
	});

	it("applies pointer-events-none and inert when isHidden", () => {
		render(
			<BottomBar isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("pointer-events-none");
		expect(el).toHaveAttribute("inert");
	});

	it("does not apply pointer-events-none or inert when visible", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).not.toContain("pointer-events-none");
		expect(el).not.toHaveAttribute("inert");
	});

	it("hides at md by default", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("md:hidden");
		expect(el.className).not.toContain("lg:hidden");
	});

	it('hides at lg when breakpoint="lg"', () => {
		render(
			<BottomBar breakpoint="lg" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("lg:hidden");
		expect(el.className).not.toContain("md:hidden");
	});

	// La classe Tailwind et la media query interrogée doivent dériver du MÊME
	// prop : deux seuils indépendants, c'est la désynchronisation qui a laissé
	// `--bottom-bar-height` publiée pour une barre invisible.
	it("derives the matchMedia query from the same breakpoint as the hide class", () => {
		render(
			<BottomBar breakpoint="lg" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		expect(useMediaQueryMock).toHaveBeenCalledWith("(width < 64rem)");
	});

	it("uses a rem-based query for the default md breakpoint", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		expect(useMediaQueryMock).toHaveBeenCalledWith("(width < 48rem)");
	});

	it("uses default z-(--z-bar) zIndex", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("z-(--z-bar)");
	});

	it("uses custom zIndex", () => {
		render(
			<BottomBar zIndex="z-50" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("z-50");
		expect(el.className).not.toContain("z-(--z-bar)");
	});

	it("passes custom className", () => {
		render(
			<BottomBar className="custom-class" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("custom-class");
	});

	// -------------------------------------------------------------------------
	// Contrat de hauteur
	// -------------------------------------------------------------------------

	it("passes the rendered element ref to the height hook (mesure, pas hypothèse)", () => {
		render(
			<BottomBar as="nav" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const { ref } = lastHeightCall();
		expect(ref?.current).toBe(screen.getByLabelText("bar"));
	});

	it("forwards the height prop as a fallback, enabled while visible", () => {
		render(
			<BottomBar height={64} enabled>
				<span>content</span>
			</BottomBar>,
		);

		expect(lastHeightCall().options).toEqual({ fallback: 64, enabled: true });
	});

	it("disables height registration when not enabled", () => {
		render(
			<BottomBar enabled={false}>
				<span>content</span>
			</BottomBar>,
		);

		expect(lastHeightCall().options).toEqual({ fallback: 56, enabled: false });
	});

	// Régression : la barre n'est masquée qu'en CSS, donc le composant reste
	// monté au-dessus du breakpoint. Publier sa hauteur malgré tout réservait de
	// la place pour une barre invisible, et chaque consommateur devait annuler
	// l'offset avec un override de breakpoint codé en dur.
	it("does not publish its height above the breakpoint (bar hidden by CSS)", () => {
		useMediaQueryMock.mockReturnValue(false);

		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		expect(lastHeightCall().options).toMatchObject({ enabled: false });
		useMediaQueryMock.mockReturnValue(true);
	});

	it("ne réserve rien quand elle est montée directement sur une route masquée", () => {
		render(
			<BottomBar isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		// Cible == état initial : `onAnimationComplete` peut ne jamais se
		// déclencher, l'état initial doit donc déjà valoir « sortie ».
		expect(lastHeightCall().options).toMatchObject({ enabled: false });
	});

	// Régression P2-5 : désenregistrer dès que `isHidden` bascule faisait
	// redescendre toaster / bandeau cookies / FAB sur une barre encore visible
	// pendant toute la durée du ressort de sortie.
	it("garde la hauteur réservée pendant le slide-out, jusqu'à la fin de l'animation", () => {
		const { rerender } = render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);
		expect(lastHeightCall().options).toMatchObject({ enabled: true });

		rerender(
			<BottomBar isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);
		expect(lastHeightCall().options).toMatchObject({ enabled: true });

		act(() => animationComplete.current?.());
		expect(lastHeightCall().options).toMatchObject({ enabled: false });
	});

	it("réserve à nouveau dès la première frame de remontée", () => {
		const { rerender } = render(
			<BottomBar isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);
		expect(lastHeightCall().options).toMatchObject({ enabled: false });

		rerender(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);
		expect(lastHeightCall().options).toMatchObject({ enabled: true });
	});

	it("snappe sans différer en reduced-motion (aucune animation à attendre)", () => {
		useReducedMotionMock.mockReturnValue(true);
		const { rerender } = render(
			<BottomBar as="nav" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);
		expect(lastHeightCall().options).toMatchObject({ enabled: true });

		rerender(
			<BottomBar as="nav" isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);
		expect(lastHeightCall().options).toMatchObject({ enabled: false });
		useReducedMotionMock.mockReturnValue(false);
	});

	// -------------------------------------------------------------------------
	// Safe-areas / matériau
	// -------------------------------------------------------------------------

	it("insère son contenu dans les safe-areas latérales (paysage iPhone)", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("pb-[env(safe-area-inset-bottom)]");
		expect(el.className).toContain("pl-[env(safe-area-inset-left)]");
		expect(el.className).toContain("pr-[env(safe-area-inset-right)]");
	});

	/**
	 * L'invariant est le même qu'avant — rien ne doit transparaître derrière les
	 * libellés — mais il ne dépend plus d'une condition.
	 *
	 * La barre était une vitre `bg-background/80 backdrop-blur-xl`, avec un repli
	 * opaque quand `backdrop-filter` manque : 20 % de transparence *sans flou*
	 * laissait passer la photo produit derrière des libellés
	 * `text-muted-foreground` et tombait sous 4,5:1 (WCAG 1.4.3). Depuis la
	 * refonte « L'intercalaire » (2026-08-04) elle est du papier opaque, toujours :
	 * le contraste ne dépend plus du support de `backdrop-filter`, et la languette
	 * d'accent a un fond neutre à mordre.
	 */
	it("est opaque, sans dépendre du support de backdrop-filter", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(el.className).toContain("bg-card");
		// Aucune opacité conditionnelle, aucun flou : plus rien à faire dépendre
		// d'une capacité du navigateur.
		expect(el.className).not.toContain("backdrop-blur");
		expect(el.className).not.toMatch(/bg-\w+\/\d/);
	});

	// Le grain papier partagé avec les cartes du catalogue (`.polaroid-paper`).
	// ⚠️ Son `::after` couvre toute la barre : il DOIT rester `pointer-events-none`,
	// sinon plus aucun onglet n'est cliquable (assertion côté CSS ci-dessous).
	it("porte la surface papier", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		expect(screen.getByLabelText("bar").className).toContain("bottom-bar-paper");
	});

	// -------------------------------------------------------------------------
	// Animation
	// -------------------------------------------------------------------------

	it("renders native element with hidden attribute when reduced motion + isHidden", () => {
		useReducedMotionMock.mockReturnValueOnce(true);
		const { container } = render(
			<BottomBar as="nav" isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		// `hidden` attribute makes the element non-accessible; query DOM directly.
		const el = container.querySelector("nav")!;
		expect(el).toHaveAttribute("hidden");
		expect(el).toHaveAttribute("inert");
		expect(el).toHaveAttribute("aria-label", "bar");
		// Native path: no Framer data attrs forwarded.
		expect(el).not.toHaveAttribute("data-transition");
	});

	it("animates to y:'100%' when hidden (full slide-out, robust to safe-area)", () => {
		render(
			<BottomBar isHidden aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(JSON.parse(el.getAttribute("data-animate")!)).toMatchObject({ y: "100%", opacity: 0 });
		// Initial entrance also offscreen via percentage (not a fixed 100px).
		expect(JSON.parse(el.getAttribute("data-initial")!)).toMatchObject({ y: "100%" });
	});

	it("animates to y:0 when visible", () => {
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(JSON.parse(el.getAttribute("data-animate")!)).toMatchObject({ y: 0, opacity: 1 });
	});

	it("slides out + becomes inert when the soft keyboard opens (motion path)", () => {
		useKeyboardOpenMock.mockReturnValueOnce(true);
		render(
			<BottomBar aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = screen.getByLabelText("bar");
		expect(JSON.parse(el.getAttribute("data-animate")!)).toMatchObject({ y: "100%", opacity: 0 });
		expect(el).toHaveAttribute("inert");
		expect(el.className).toContain("pointer-events-none");
	});

	it("snaps hidden via `hidden` attribute when keyboard opens (reduced motion)", () => {
		useReducedMotionMock.mockReturnValueOnce(true);
		useKeyboardOpenMock.mockReturnValueOnce(true);
		const { container } = render(
			<BottomBar as="nav" aria-label="bar">
				<span>content</span>
			</BottomBar>,
		);

		const el = container.querySelector("nav")!;
		expect(el).toHaveAttribute("hidden");
		expect(el).toHaveAttribute("inert");
	});
});

// ---------------------------------------------------------------------------
// Exported class constants
// ---------------------------------------------------------------------------

describe("Exported class constants", () => {
	it("bottomBarContainerClass contains flex", () => {
		expect(bottomBarContainerClass).toContain("flex");
	});

	// Un `<li>` est `display: list-item` : sans ce conteneur flex intermédiaire,
	// le `flex-1` de l'item n'aurait aucun effet et les onglets ne se
	// répartiraient plus la largeur.
	it("bottomBarItemWrapperClass rend le <li> flex pour que flex-1 s'applique", () => {
		expect(bottomBarItemWrapperClass).toContain("flex");
		expect(bottomBarItemWrapperClass).toContain("flex-1");
	});

	// L'anneau de focus ne peut PAS venir de `focus-ring` : cet utilitaire tire sur
	// `--ring`, qui vaut `--primary` — 1,55:1 sur le fond de la barre, là où WCAG
	// 1.4.11 exige 3:1. Il est remplacé par un contour `--foreground` (19,54:1).
	it("bottomBarItemClass n'utilise PAS focus-ring (--ring = --primary, 1,55:1)", () => {
		expect(bottomBarItemClass).not.toContain("focus-ring");
	});

	it("bottomBarItemClass pose un contour de focus sur --foreground", () => {
		expect(bottomBarItemClass).toContain("focus-visible:outline-foreground");
		expect(bottomBarItemClass).toContain("focus-visible:outline-2");
	});

	// L'anneau de focus est un box-shadow EXTERNE et les onglets sont jointifs et
	// tous `relative` : sans `z-10` au focus, l'onglet suivant repeint le bord
	// partagé de l'anneau (WCAG 2.4.11).
	it("bottomBarItemClass élève l'onglet focalisé au-dessus de ses voisins", () => {
		expect(bottomBarItemClass).toContain("focus-visible:z-10");
		expect(bottomBarItemClass).toContain("relative");
	});

	it("bottomBarItemClass contains min touch target", () => {
		expect(bottomBarItemClass).toContain("min-h-14");
	});

	// ⚠️ En px, pas en rem : une cible tactile ne suit pas la police racine.
	// Détail et garde dédié dans `bottom-bar-touch-target-px.regression.test.ts`.
	it("bottomBarItemClass contains min-width", () => {
		expect(bottomBarItemClass).toContain("min-w-[44px]");
	});

	// Le retour tactile de la pression est un transform : il suit la préférence
	// de mouvement, comme tous les autres transforms de la primitive.
	it("bottomBarItemClass gate son scale de pression derrière motion-safe", () => {
		expect(bottomBarItemClass).toContain("motion-safe:active:scale-[0.98]");
		expect(bottomBarItemClass).not.toMatch(/(^|\s)active:scale-/);
	});

	it("bottomBarActiveItemClass contains active styles", () => {
		expect(bottomBarActiveItemClass).toContain("text-foreground");
	});

	it("bottomBarActiveItemClass does not add background tint (refined 2026)", () => {
		expect(bottomBarActiveItemClass).not.toContain("bg-primary/5");
	});

	it("bottomBarActiveItemClass includes forced-colors outline", () => {
		expect(bottomBarActiveItemClass).toContain("forced-colors:outline");
		expect(bottomBarActiveItemClass).toContain("forced-colors:outline-[Highlight]");
	});

	it("bottomBarActiveItemClass includes contrast-more outline", () => {
		expect(bottomBarActiveItemClass).toContain("contrast-more:outline");
	});

	it("bottomBarBadgeClass contains badge styles", () => {
		expect(bottomBarBadgeClass).toContain("rounded-full");
		expect(bottomBarBadgeClass).toContain("bg-destructive");
		expect(bottomBarBadgeClass).toContain("ring-2");
	});

	it("bottomBarBadgeClass includes forced-colors outline", () => {
		expect(bottomBarBadgeClass).toContain("forced-colors:outline");
	});

	it("bottomBarIconClass defines size", () => {
		expect(bottomBarIconClass).toContain("size-5");
	});

	it("bottomBarLabelClass defines text size and truncation", () => {
		expect(bottomBarLabelClass).toContain("text-xs");
		expect(bottomBarLabelClass).toContain("truncate");
	});
});
