/**
 * @regression product-filter-rail-sticky
 *
 * Le rail de filtres desktop ne s'accrochait PAS, et sa zone de défilement
 * exhibait une barre système nue. Deux défauts distincts, tous deux invisibles
 * partout ailleurs — jsdom ne fait pas de layout, et `pnpm build` ne mesure rien.
 *
 * ## Défaut 1 — un `sticky` sans course
 *
 * `product-catalog.tsx` pose `lg:items-start` sur la grille [rail | contenu],
 * donc la colonne du rail valait `align-self: start` : sa hauteur ÉTAIT celle de
 * son contenu. Or un élément `position: sticky` ne peut se déplacer que dans son
 * bloc conteneur — ici le wrapper, exactement aussi haut que lui. Course = 0 px :
 * le rail défilait avec la page, `position: sticky` appliqué et sans effet.
 * Mesuré après correctif (Playwright, 1440×900) : wrapper 4049 px, rail 740 px,
 * accroché à `top: 144px`.
 *
 * ⚠️ C'est le piège général : `items-start` + enfant `sticky` = sticky mort. Le
 * correctif est `self-stretch` sur la colonne, JAMAIS un `h-full` (qui remonterait
 * à un parent sans hauteur définie et ne résoudrait rien).
 *
 * ## Défaut 2 — fondu et barre masquée sur le mauvais élément
 *
 * `scroll-fade-y` et `no-scrollbar` étaient posés sur un enfant du conteneur de
 * défilement. Or le fondu est une `animation-timeline: scroll(self y)` — inactive
 * sur un élément qui ne défile pas, donc muette — et `no-scrollbar` ne masque que
 * la barre DE l'élément qui la porte. Les deux étaient inertes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = join(__dirname, "..");

/**
 * Retire les commentaires : ce fichier-ci comme les JSDoc du rail nomment les
 * classes en jeu pour expliquer POURQUOI elles y sont. Sans dépouillement, le
 * test se satisferait de sa propre documentation.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const read = (file: string) => stripComments(readFileSync(join(COMPONENTS_DIR, file), "utf-8"));

const RAIL = read("product-filter-rail.tsx");
const SHELL = read("product-catalog.tsx");

/** La ligne du conteneur de défilement du rail — celle qui porte `overflow-y-auto`. */
const scrollerLine = RAIL.split("\n").find((line) => line.includes("overflow-y-auto"));

/**
 * La ligne de la plaque « salle rose » — celle qui porte `sticky`. Depuis
 * l'audit /produits (2026-08-05, direction B), la plaque teintée porte le
 * sticky et le plafond de hauteur, et le conteneur de défilement est son
 * ENFANT : `scroll-fade-y` est un `mask-image`, le poser sur la plaque
 * dissoudrait aussi son fond et son bord aux lisières.
 */
const plaqueLine = RAIL.split("\n").find((line) => line.includes("sticky"));

describe("@regression product-filter-rail-sticky", () => {
	it("la colonne du rail réclame la hauteur de sa rangée quand le shell aligne en start", () => {
		// La condition est LIÉE : `self-stretch` n'est obligatoire que parce que le
		// shell aligne les colonnes en `start`. Si un jour le shell laisse le
		// `stretch` par défaut, ce test cesse d'exiger la classe — mais il continue
		// d'interdire la combinaison qui a cassé le sticky.
		if (SHELL.includes("lg:items-start")) {
			expect(
				RAIL,
				"le shell aligne les colonnes en `start` : sans `self-stretch`, la colonne du rail fait la hauteur de son contenu et son enfant `sticky` n'a aucune course.",
			).toMatch(/\bself-stretch\b/);
		}
	});

	it("la plaque est l'élément collant et plafonné, et borne son enfant défilant", () => {
		expect(plaqueLine, "plaque du rail (ligne `sticky`) introuvable").toBeDefined();

		for (const cls of [
			// Sans `sticky`, le rail remonte avec la page.
			"sticky",
			// Sans plafond de hauteur, le `sticky` déborde du viewport et le bas du
			// rail (disponibilité, « Tout effacer ») devient inatteignable.
			// (`-2rem` depuis que la barre sticky est `lg:hidden` : le rail colle à
			// `navbar + 1rem` et garde 1rem de respiration en bas.)
			"max-h-[calc(100dvh-var(--navbar-height-static)-2rem)]",
			// `flex-col` + `min-h-0` (sur l'enfant) : c'est le couple qui transmet le
			// plafond au conteneur de défilement — sans lui, l'enfant pousse la
			// plaque au-delà du viewport et ne défile jamais.
			"flex-col",
		]) {
			expect(plaqueLine, `\`${cls}\` doit vivre sur la plaque collante`).toContain(cls);
		}
	});

	it("le conteneur de défilement porte lui-même le fondu, le masquage de barre et min-h-0", () => {
		expect(scrollerLine, "conteneur de défilement du rail introuvable").toBeDefined();
		expect(scrollerLine, "plaque et conteneur de défilement doivent être deux éléments").not.toBe(
			plaqueLine,
		);

		for (const cls of [
			// `scroll(self y)` : le fondu est muet sur un élément qui ne défile pas.
			"scroll-fade-y",
			// `no-scrollbar` ne masque que la barre de l'élément qui la porte.
			"no-scrollbar",
			// Sans `min-h-0`, l'enfant flex refuse de rétrécir sous son contenu :
			// il ne défile jamais et pousse la plaque hors du viewport.
			"min-h-0",
		]) {
			expect(scrollerLine, `\`${cls}\` doit vivre sur le conteneur de défilement`).toContain(cls);
		}
	});

	it("aucun autre élément du rail ne porte le fondu ou le masquage de barre", () => {
		// C'est la forme exacte du défaut : les deux classes un niveau plus bas, sur
		// un élément sans `overflow`. Elles n'y produisent RIEN.
		const strays = RAIL.split("\n").filter(
			(line) =>
				(line.includes("scroll-fade-y") || line.includes("no-scrollbar")) &&
				!line.includes("overflow-y-auto"),
		);

		expect(
			strays,
			"fondu ou masquage de barre posé hors du conteneur de défilement — inerte.",
		).toEqual([]);
	});
});
