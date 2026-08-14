/**
 * @regression bottom-bar-accent-is-a-surface
 *
 * Les quatre accents de marque sont des **aplats**, jamais de l'encre.
 *
 * C'est l'invariant qui rend la barre du bas franchement colorée SANS concession
 * d'accessibilité, et il est entièrement contre-intuitif — d'où ce garde. Mesuré
 * par conversion OKLab depuis `app/globals.css` le 2026-08-04 :
 *
 *   | accent    | hex      | en TEXTE sur le fond | en APLAT sous --foreground |
 *   |-----------|----------|----------------------|----------------------------|
 *   | rose      | #fdb8e4  | 1,55:1  ✗            | 12,60:1  ✓                 |
 *   | soleil    | #eec976  | 1,54:1  ✗            | 12,68:1  ✓                 |
 *   | menthe    | #6ccea6  | 1,85:1  ✗            | 10,54:1  ✓                 |
 *   | lavande   | #a996e2  | 2,49:1  ✗            |  7,85:1  ✓                 |
 *
 * Autrement dit : le MÊME token passe de « très en dessous de AA » à « largement
 * au-dessus de AAA » selon qu'on le peint en fond ou en lettres. Inverser le sens
 * de lecture — écrire `text-(--section-accent)` sur un fond clair — produit un
 * libellé illisible que rien d'autre ne signale : ni `tsc`, ni le lint, ni un
 * test de rendu, et l'œil d'un voyant s'y habitue.
 *
 * Le même raisonnement vaut pour l'anneau de focus, resté sur `--foreground` :
 * c'est un trait, donc de l'encre.
 *
 * Toute modification requiert une review explicite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { bottomBarActiveItemClass, bottomBarItemClass } from "../bottom-bar.styles";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Les surfaces qui composent la barre, tous hôtes confondus. */
const SOURCES = [
	"shared/components/bottom-bar/bottom-bar.tsx",
	"shared/components/bottom-bar/bottom-bar.styles.ts",
	"app/(shop)/(home)/_components/shop-mobile-bottom-nav.tsx",
	"app/admin/(protected)/_components/admin-mobile-bottom-bar.tsx",
];

/** Tokens d'accent de marque, sous toutes leurs orthographes Tailwind v4. */
const ACCENT_TOKENS = [
	"--section-accent",
	"--color-brand-lavender",
	"--color-brand-mint",
	"--color-brand-sun",
];

describe("@regression bottom-bar-accent-is-a-surface — l'accent peint des fonds", () => {
	it("l'onglet courant porte une languette de fond, pas une couleur de texte", () => {
		expect(bottomBarActiveItemClass).toContain("bottom-bar-tab-current");
		expect(bottomBarActiveItemClass).toContain("text-foreground");
	});

	it("la règle CSS de la languette peint bien un background-color", () => {
		const css = read("app/styles/components.css");
		const start = css.indexOf(".bottom-bar-tab-current");
		expect(start).toBeGreaterThan(-1);
		const block = css.slice(css.indexOf("{", start), css.indexOf("}", start));

		expect(block).toMatch(/background-color:\s*var\(--section-accent/);
		expect(block).not.toMatch(/(^|[^-])color:\s*var\(--section-accent/);
	});

	/**
	 * Le repli n'est pas décoratif : hors d'un `[data-accent]`, `--section-accent`
	 * n'existe pas. Sans repli la languette serait TRANSPARENTE, donc l'onglet
	 * courant invisible, en silence.
	 *
	 * ⚠️ Et depuis le passage de la navigation au mono-rose (2026-08-06), ce
	 * repli est le régime NOMINAL des deux hôtes : plus aucun onglet ne pose
	 * `data-accent` (la boutique déclinait une couleur par onglet). Cette
	 * assertion est donc devenue le SEUL garant de la couleur de la languette —
	 * la supprimer comme « défensive » laisserait la barre du bas sans état
	 * courant visible, partout, sans qu'aucun autre test ne bouge.
	 */
	it("la languette retombe sur le rose signature hors [data-accent]", () => {
		const css = read("app/styles/components.css");
		const start = css.indexOf(".bottom-bar-tab-current");
		const block = css.slice(css.indexOf("{", start), css.indexOf("}", start));

		expect(block).toMatch(/var\(--section-accent,\s*var\(--primary\)\)/);
	});

	/**
	 * ⚠️ La languette doit battre le survol et la pression, sinon elle disparaît
	 * sous le curseur.
	 *
	 * `can-hover:hover:bg-primary/5` et `active:bg-primary/10` compilent en
	 * `.classe:hover` / `.classe:active`, soit une spécificité (0,2,0) contre
	 * (0,1,0) pour une classe nue : la pseudo-classe gagnait. Constaté au rendu
	 * (`getComputedStyle` avant/après `hover` sur `/produits`) — la languette
	 * lavande devenait un rose à 5 % dès qu'on la survolait sur iPad avec souris.
	 * Invisible en test unitaire, invisible à l'œil sur une capture.
	 */
	it("la languette bat le survol et la pression", () => {
		const css = read("app/styles/components.css");
		const start = css.indexOf(".bottom-bar-tab-current");
		const selector = css.slice(start, css.indexOf("{", start));

		expect(selector).toContain(".bottom-bar-tab-current:hover");
		expect(selector).toContain(".bottom-bar-tab-current:active");
	});

	it.each(SOURCES)("%s n'emploie aucun accent comme couleur de TEXTE", (rel) => {
		const src = read(rel);
		for (const token of ACCENT_TOKENS) {
			// `text-(--section-accent)` / `text-[var(--section-accent)]` — les deux
			// syntaxes Tailwind v4 pour une couleur de texte arbitraire.
			expect(src).not.toMatch(new RegExp(`text-\\(${token}`));
			expect(src).not.toMatch(new RegExp(`text-\\[var\\(${token}`));
		}
	});

	/**
	 * L'anneau de focus est un TRAIT, donc de l'encre : il ne peut pas prendre un
	 * accent. C'est exactement le défaut corrigé au lot 0 — `--ring` valait
	 * `--primary`, soit 1,55:1.
	 */
	it("l'anneau de focus reste sur --foreground, jamais sur un accent", () => {
		expect(bottomBarItemClass).toContain("focus-visible:outline-foreground");
		for (const token of ACCENT_TOKENS) {
			expect(bottomBarItemClass).not.toContain(`outline-(${token}`);
		}
		expect(bottomBarItemClass).not.toContain("focus-visible:outline-ring");
		expect(bottomBarItemClass).not.toContain("focus-visible:outline-primary");
	});

	/**
	 * La couleur seule ne suffit jamais : sous Windows High Contrast les
	 * `background-color` sont écrasés, donc la languette disparaîtrait sans
	 * contour. Le garde existait déjà pour la pastille — il doit survivre à son
	 * remplacement.
	 */
	it("l'état courant reste perceptible sans la couleur", () => {
		expect(bottomBarActiveItemClass).toContain("forced-colors:outline");
		expect(bottomBarActiveItemClass).toContain("contrast-more:outline");
	});
});
