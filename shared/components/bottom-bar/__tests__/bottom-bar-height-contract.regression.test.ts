/**
 * @regression bottom-bar-height-contract
 *
 * Verrouille le contrat de `--bottom-bar-height` (audit bottom-bar 2026-07-30, P1).
 *
 * Le défaut d'origine : la barre publiait un **littéral px issu d'un prop** (56)
 * alors que sa hauteur réelle est `h-14` (**3.5rem**, donc dépendante de la police
 * racine) **plus** `padding-bottom: env(safe-area-inset-bottom)`. Trois nombres
 * indépendants pour une seule grandeur, sans aucun garde entre eux :
 *
 * - à 200 % de police racine (WCAG 1.4.4) la barre mesurait 112px et la variable
 *   disait 56 → le contenu des listes admin et le footer sticky « Enregistrer »
 *   passaient DERRIÈRE la barre ;
 * - sur encoche iPhone la barre mesurait 90px et la variable 56, ce qui a fait
 *   diverger les consommateurs en deux camps — certains réadditionnaient
 *   `env(safe-area-inset-bottom)`, d'autres non — dont un seul pouvait être juste.
 *
 * Depuis, la variable porte la hauteur **mesurée**, safe-area incluse. Les trois
 * assertions ci-dessous verrouillent les trois faces de ce contrat. Toute
 * modification requiert une review explicite.
 */
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { bottomBarContainerClass } from "../bottom-bar.styles";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("@regression bottom-bar-height-contract — la hauteur est mesurée, pas supposée", () => {
	const hook = read("shared/hooks/use-bottom-bar-height.ts");
	const component = read("shared/components/bottom-bar/bottom-bar.tsx");

	it("le hook lit offsetHeight et observe l'élément", () => {
		// `offsetHeight` est le seul lecteur qui inclut le padding safe-area ET
		// suit les rem. Un `ResizeObserver` maintient la valeur à jour quand la
		// police racine change ou que l'appareil tourne.
		expect(hook).toMatch(/offsetHeight/);
		expect(hook).toMatch(/new ResizeObserver/);
	});

	it("la mesure l'emporte sur le repli, mais jamais une mesure à 0", () => {
		// Le garde `measured > 0` couvre la fenêtre où la media query CSS et la
		// `matchMedia` JS divergent d'une fraction de px : publier `0px` ferait
		// coller tous les consommateurs sous une barre bien présente.
		expect(hook).toMatch(/measured\s*>\s*0\s*\?\s*measured\s*:\s*fallback/);
	});

	it("le composant passe le ref de l'élément rendu, pas un nombre", () => {
		expect(component).toMatch(/useBottomBarHeight\(\s*barRef\s*,/);
		// Les 4 branches de rendu (nav/div × motion/reduced-motion) doivent toutes
		// porter le ref, sinon la branche oubliée retombe silencieusement sur le repli.
		expect([...component.matchAll(/ref=\{barRef/g)]).toHaveLength(4);
	});
});

describe("@regression bottom-bar-height-contract — le repli reste d'accord avec la hauteur CSS", () => {
	it("le défaut `height` de BottomBar vaut exactement le `h-*` du conteneur", () => {
		const spacingStep = bottomBarContainerClass.match(/(?:^|\s)h-(\d+)(?:\s|$)/);
		expect(spacingStep, "bottomBarContainerClass doit fixer une hauteur `h-<n>`").not.toBeNull();

		// Échelle Tailwind : `h-n` = n × 0.25rem, soit n × 4 px à police racine 16px.
		const containerHeightPx = Number(spacingStep![1]) * 4;

		const defaultHeight = read("shared/components/bottom-bar/bottom-bar.tsx").match(
			/height\s*=\s*(\d+),/,
		);
		expect(defaultHeight, "BottomBar doit garder un défaut `height` numérique").not.toBeNull();

		// C'est l'assertion qui manquait : les deux nombres décrivent la même barre.
		// Le repli ne sert qu'avant la première mesure, mais s'il mentait, le premier
		// frame (et jsdom, et le SSR) réservaient la mauvaise hauteur.
		expect(Number(defaultHeight![1])).toBe(containerHeightPx);
	});
});

describe("@regression bottom-bar-height-contract — aucun consommateur ne réadditionne la safe-area", () => {
	/**
	 * `--bottom-bar-height` inclut déjà `env(safe-area-inset-bottom)`. L'y
	 * réadditionner compte l'encoche deux fois (~34px de vide mort sur iPhone).
	 *
	 * ⚠️ Le `max(calc(var(--bottom-bar-height,0px)+1rem),env(safe-area-inset-bottom,0px))`
	 * des consommateurs flottants est LÉGITIME et ne doit pas être signalé : la
	 * safe-area y est une borne alternative pour le cas SANS barre, pas un terme
	 * additionné. C'est pourquoi l'assertion cible l'addition, pas la co-présence.
	 */
	const FORBIDDEN =
		/var\(--bottom-bar-height,[^)]*\)\s*\+\s*(?:env\(\s*safe-area-inset-bottom|max\([^)]*env\(\s*safe-area-inset-bottom)/;

	it("aucun site n'ajoute env(safe-area-inset-bottom) à la variable", () => {
		const offenders = collectSourceFiles().flatMap(({ rel, code }) =>
			[...code.matchAll(/var\(--bottom-bar-height/g)]
				.map((m) => code.slice(m.index, m.index + 160).replace(/\s+/g, " "))
				.filter((snippet) => FORBIDDEN.test(snippet))
				.map((snippet) => `${rel}: ${snippet}`),
		);

		expect(offenders).toEqual([]);
	});

	it("le garde-fou attrape bien la forme fautive (garde du garde)", () => {
		// Prouve que l'assertion ci-dessus n'est pas verte par accident : la forme
		// exacte qui existait avant l'audit doit être rejetée, et la forme
		// canonique acceptée.
		expect(
			FORBIDDEN.test("calc(var(--bottom-bar-height,0px) + max(1rem,env(safe-area-inset-bottom)))"),
		).toBe(true);
		expect(FORBIDDEN.test("calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))")).toBe(
			true,
		);
		expect(
			FORBIDDEN.test(
				"max(calc(var(--bottom-bar-height,0px)+1rem),env(safe-area-inset-bottom,0px))",
			),
		).toBe(false);
		expect(FORBIDDEN.test("pb-[calc(var(--bottom-bar-height,56px)+1rem)]")).toBe(false);
	});
});

/**
 * Sources de PRODUCTION susceptibles de consommer la variable. Les tests sont
 * exclus : ce fichier contient lui-même les littéraux fautifs dans ses regex et
 * dans le garde du garde, qu'il compterait comme des violations.
 */
function collectSourceFiles(): Array<{ rel: string; code: string }> {
	return globSync(["app/**/*.{ts,tsx,css}", "modules/**/*.{ts,tsx}", "shared/**/*.{ts,tsx,css}"], {
		cwd: ROOT,
	})
		.map(String)
		.filter((rel) => !rel.includes("__tests__") && !/\.test\.tsx?$/.test(rel))
		.map((rel) => ({ rel, code: read(rel) }));
}
