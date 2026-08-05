import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/constants/brand", () => ({
	BRAND: {
		name: "Synclune",
		tagline: "Créations uniques faites avec amour",
		logo: {
			alt: "Synclune — Créations artisanales faites main",
		},
	},
}));

const triggerHapticMock = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: (...args: unknown[]) => triggerHapticMock(...args),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
		"aria-label": ariaLabel,
		onClick,
		...props
	}: Record<string, unknown> & { children?: unknown; href: string }) => {
		const { createElement } = require("react");
		return createElement(
			"a",
			{ href, className, "aria-label": ariaLabel, onClick, ...props },
			children,
		);
	},
}));

// ⚠️ `logo-mark` n'est PAS mocké : le passage au SVG inline est précisément ce
// que ces tests doivent voir. Un mock ici rendrait la suite aveugle au fait que
// le disque est devenu une surface CSS et le « 5 » une découpe.
import { Logo } from "../logo";

// ============================================================================
// SETUP
// ============================================================================

afterEach(() => {
	cleanup();
	triggerHapticMock.mockClear();
});

const markRoot = (container: HTMLElement) => container.querySelector("[style*='--logo-disc']");

// ============================================================================
// TESTS
// ============================================================================

describe("Logo", () => {
	// =========================================================================
	// Le mark : SVG inline, plus d'image
	// =========================================================================

	it("dessine la marque en SVG, sans passer par le réseau", () => {
		const { container } = render(<Logo />);

		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
	});

	it("tient son socle et son cœur des JETONS de marque, pas d'un bitmap", () => {
		// Le raster cuisait `#fdb8e4` dans ses pixels : le rose du logo et le rose
		// du site étaient deux valeurs distinctes qui se ressemblaient. Ici c'est la
		// même — recolorer `--primary` recolore la marque.
		const style = markRoot(render(<Logo />).container)?.getAttribute("style") ?? "";
		expect(style).toContain("--logo-disc: var(--primary)");
		expect(style).toContain("--logo-heart: var(--secondary)");
		// L'encre n'a pas de jeton (brun feutre mesuré sur le raster, distinct de
		// `--foreground`) : sa valeur en dur EST le contrat.
		expect(style).toContain("--logo-ink: #4c2420");
	});

	it("porte le nom de la marque pour les lecteurs d'écran quand il n'y a pas de texte", () => {
		render(<Logo />);

		// L'`alt` de l'image portait ce rôle ; un SVG décoratif ne le porte plus.
		expect(screen.getByText("Synclune — Créations artisanales faites main")).toBeInTheDocument();
	});

	it("ne double PAS l'annonce quand le wordmark est visible", () => {
		render(<Logo showText />);

		expect(screen.getByText("Synclune")).toBeInTheDocument();
		expect(screen.queryByText("Synclune — Créations artisanales faites main")).toBeNull();
	});

	it("ne répète pas la marque en sr-only quand le lien porte déjà son aria-label", () => {
		// L'ancre nomme la marque (`aria-label` via `brandLinkLabel`) ; un span
		// sr-only en contenu serait relu en traversée — la marque annoncée deux
		// fois (mesuré sur l'arbre AX du footer, audit 2026-08-05).
		render(<Logo href="/" />);

		expect(screen.queryByText("Synclune — Créations artisanales faites main")).toBeNull();
	});

	// =========================================================================
	// Le geste « L'étincelle »
	// =========================================================================

	it("garde les étincelles DANS le disque par défaut", () => {
		const { container } = render(<Logo />);

		// Aucun décalage : les étoiles sont à leur place d'origine.
		expect(container.innerHTML).not.toContain("translate-x-");
	});

	it("fait sortir les étincelles du socle quand on le demande", () => {
		const { container } = render(<Logo sparkles="escaping" />);

		expect(container.innerHTML).toContain("translate-x-");
		expect(container.innerHTML).toContain("scale-[1.12]");
	});

	it("n'anime les étincelles que derrière motion-safe, et au focus comme au survol", () => {
		const { container } = render(<Logo href="/" sparkles="escaping" />);
		const html = container.innerHTML;

		// Repli `prefers-reduced-motion` : tout le mouvement est gaté.
		expect(html).toContain("motion-safe:transition-transform");
		expect(html).not.toMatch(/(?<!motion-safe:)group-hover\/logo:scale/);
		// WCAG 2.4.7 — ce que le survol révèle, le clavier doit le révéler aussi.
		expect(html).toContain("group-hover/logo:scale-[1.26]");
		expect(html).toContain("group-focus-visible/logo:scale-[1.26]");
	});

	it("n'anime rien quand le logo ne mène nulle part", () => {
		const { container } = render(<Logo sparkles="escaping" />);

		expect(container.innerHTML).not.toContain("group-hover/logo:");
	});

	it("nomme son groupe, pour ne pas capter les variants de ses voisins", () => {
		// Un `group` NU deviendrait le premier ancêtre `.group` de tous ses
		// descendants — bug déjà payé sur le `<header>` de la navbar.
		render(<Logo href="/" />);

		const link = screen.getByRole("link");
		expect(link.className).toContain("group/logo");
		expect(link.className).not.toMatch(/(?:^|\s)group(?:\s|$)/);
	});

	// =========================================================================
	// Lien, libellé, cible
	// =========================================================================

	it("renders with a link when href is provided", () => {
		render(<Logo href="/" />);
		expect(screen.getByRole("link")).toHaveAttribute("href", "/");
	});

	it("uses homepage aria-label when href is /", () => {
		render(<Logo href="/" />);
		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Synclune - Accueil");
	});

	it("uses admin aria-label when href is /admin", () => {
		render(<Logo href="/admin" />);
		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Synclune - Administration");
	});

	it("falls back to BRAND.name (no '- Accueil' suffix) for unknown hrefs without ariaLabel", () => {
		render(<Logo href="/produits" />);
		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Synclune");
	});

	it("uses custom ariaLabel when provided (overrides default fallback)", () => {
		render(<Logo href="/produits" ariaLabel="Voir le catalogue" />);
		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Voir le catalogue");
	});

	it("renders without a link when no href is provided", () => {
		render(<Logo />);
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("does not trigger haptic on tap (nav passive — feedback_no_haptic_on_logo)", () => {
		render(<Logo href="/" />);
		fireEvent.click(screen.getByRole("link"));
		expect(triggerHapticMock).not.toHaveBeenCalled();
	});

	it("applies min-h-11/min-w-11 on the link when icon-only (touch target WCAG 2.5.5)", () => {
		render(<Logo href="/" />);
		expect(screen.getByRole("link").className).toContain("min-h-11");
	});

	it("omits min-h-11/min-w-11 on the link when showText is true (text is the affordance)", () => {
		render(<Logo href="/" showText />);
		expect(screen.getByRole("link").className).not.toContain("min-h-11");
	});

	it("l'anneau de focus épouse le disque, quelle que soit la surface", () => {
		render(<Logo href="/admin" />);

		const link = screen.getByRole("link");
		expect(link.className).toContain("rounded-full");
		expect(link.className).toContain("focus-ring");
	});

	// =========================================================================
	// Géométrie
	// =========================================================================

	it("renders with custom size applied as style dimensions", () => {
		const { container } = render(<Logo size={64} />);

		const sizeContainer = container.querySelector("[style*='width']");
		expect(sizeContainer).toHaveAttribute("style", expect.stringContaining("width: 64px"));
		expect(sizeContainer).toHaveAttribute("style", expect.stringContaining("height: 64px"));
	});

	it("applies viewTransitionName on the mark wrapper", () => {
		const { container } = render(<Logo viewTransitionName="shop-logo-footer" size={40} />);

		expect(container.querySelector("[style*='view-transition-name']")).toHaveAttribute(
			"style",
			expect.stringContaining("view-transition-name: shop-logo-footer"),
		);
	});

	it("applique une ombre PORTÉE, qui épouse la silhouette", () => {
		// `shadow-md` dessinait un rectangle autour du disque ; depuis que les
		// étincelles en sortent, la boîte n'est plus la forme. `drop-shadow` suit le
		// tracé réel.
		const { container } = render(<Logo shadow />);

		expect(container.querySelector("[style*='width']")?.className).toContain("drop-shadow-md");
	});

	it("n'accompagne pas l'ombre d'une transition que rien ne déclenche", () => {
		// `transition-[filter]` était doublement morte : aucun état ne module
		// `filter`, et la branche `href` écrasait de toute façon la liste via
		// `transition-transform` (mesuré : transition-property calculée =
		// « transform, translate, scale, rotate », durée 0.15s).
		const { container } = render(<Logo href="/" shadow />);

		expect(container.querySelector("[style*='width']")?.className).not.toContain(
			"transition-[filter]",
		);
	});

	it("applies hover/active scale on the inner visual wrapper, not the anchor", () => {
		const { container } = render(<Logo href="/" />);

		const link = screen.getByRole("link");
		expect(link.className).not.toContain("hover:scale-[1.02]");

		const visualWrapper = container.querySelector("[style*='width']");
		expect(visualWrapper?.className).toContain("can-hover:hover:scale-[1.02]");
		expect(visualWrapper?.className).toContain("active:scale-[0.98]");
		// Le retour presse DOIT être doublé sous `can-hover:` : au clic maintenu
		// sur pointeur fin, hover et active sont vrais ensemble et la règle
		// `can-hover:hover` — émise après le `active:` nu dans le CSS compilé —
		// gagnerait seule. La variante composée est émise après le hover : c'est
		// elle qui rend le 0.98 visible à la souris (le `active:` nu couvre le
		// tactile). Audit logo 2026-08-05, même mécanique que la galerie.
		expect(visualWrapper?.className).toContain("motion-safe:can-hover:active:scale-[0.98]");
	});

	it("n'anime pas le survol quand le logo ne mène nulle part (pas de href)", () => {
		const { container } = render(<Logo size={96} />);

		expect(container.querySelector("[style*='width']")?.className).not.toContain("scale-[1.02]");
	});

	it("uses font-cursive as default text font when showText is true", () => {
		render(<Logo showText />);
		expect(screen.getByText("Synclune").className).toContain("font-cursive");
	});
});
