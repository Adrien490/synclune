/**
 * @regression view-transition-names
 *
 * Trois liens que ni le typage ni le build ne voient, et dont la rupture est
 * silencieuse dans les trois cas.
 *
 * 1. **Nom ↔ CSS.** `PAGE_CONTENT_VIEW_TRANSITION_NAME` est posé en JS par les
 *    frontières `<ViewTransition>` et stylé en CSS par `pwa.css`. Le CSS ne
 *    sait pas importer : renommer d'un côté ne casse rien, le fondu retombe
 *    juste sur le défaut UA.
 *
 * 2. **Durées égales du snapshot `root`.** Depuis que le `<main>` porte son
 *    propre nom, `root` ne capture plus que le chrome — qui ne change PAS d'une
 *    page à l'autre. Le navigateur empile quand même ses deux snapshots : seules
 *    des durées égales font que `1 - ease(t)` et `ease(t)` se somment à 1. Les
 *    désaccorder (l'ancien 180/240 ms) fait clignoter navbar et pied de page à
 *    chaque navigation, sans qu'aucun test de rendu ne le voie.
 *
 * 3. **Polarité opt-in des deux frontières.** `default: "none"` est ce qui
 *    empêche CHAQUE tronçon streamé par PPR de rejouer le fondu — 4 transitions
 *    enchaînées de ~300 ms au premier rendu de `/produits`, mesurées le
 *    2026-08-18. Le jour où une frontière repasse en `update: "auto"` nu, la
 *    régression est invisible en test de rendu et coûteuse en LCP.
 *
 * 4. **Silence du rail de filtres.** Il applique à la coche : son retour est le
 *    grisage `data-pending`, pas un fondu de 200 ms par case. Comme la frontière
 *    est en opt-in, il lui suffit de NE PAS réclamer le type — ce que ce test
 *    vérifie, faute de quoi la décision se perdrait au premier copier-coller
 *    depuis un formulaire admin.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PAGE_CONTENT_VIEW_TRANSITION_NAME, PAGE_FADE_TRANSITION_TYPE } from "../view-transitions";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const read = (relativePath: string) => readFileSync(join(REPO_ROOT, relativePath), "utf-8");

const CSS = read("app/styles/pwa.css");
const LAYOUTS = ["app/(shop)/layout.tsx", "app/admin/(protected)/layout.tsx"] as const;
const RAIL_HOOK = read("modules/products/hooks/use-immediate-product-filters.ts");

/** Durée (ms) de l'animation déclarée pour un pseudo-élément nommé. */
function durationOf(pseudo: "old" | "new", name: string): number | null {
	const match = CSS.match(
		new RegExp(`::view-transition-${pseudo}\\(${name}\\)\\s*\\{[^}]*?(\\d+)ms`),
	);
	return match ? Number(match[1]) : null;
}

describe("@regression view-transition-names", () => {
	it("le nom du contenu de page est stylé dans pwa.css", () => {
		expect(durationOf("old", PAGE_CONTENT_VIEW_TRANSITION_NAME)).not.toBeNull();
		expect(durationOf("new", PAGE_CONTENT_VIEW_TRANSITION_NAME)).not.toBeNull();
	});

	it("les deux moitiés du fondu `root` ont la MÊME durée", () => {
		const out = durationOf("old", "root");
		const enter = durationOf("new", "root");

		expect(out).not.toBeNull();
		expect(
			enter,
			"Des durées inégales creusent la somme des deux opacités : le chrome, " +
				"identique de part et d'autre, se met à clignoter.",
		).toBe(out);
	});

	it("la réduction de mouvement coupe TOUS les noms, pas seulement `root`", () => {
		const reduced = CSS.slice(
			CSS.indexOf("@media (prefers-reduced-motion: reduce)", CSS.indexOf("@view-transition")),
		);

		expect(
			reduced,
			"React démarre ses transitions sans lire la media query : le sélecteur " +
				"universel est la SEULE coupure côté navigation client.",
		).toMatch(/::view-transition-old\(\*\)/);
		expect(reduced).toMatch(/::view-transition-new\(\*\)/);
	});

	it.each(LAYOUTS)("%s n'anime que sur demande explicite", (layout) => {
		const source = read(layout);

		expect(
			source,
			'Sans `default: "none"`, chaque tronçon streamé par PPR relance un fondu.',
		).toMatch(/update=\{\{\s*\[PAGE_FADE_TRANSITION_TYPE\]:\s*"auto",\s*default:\s*"none"\s*\}\}/);
	});

	it("le rail de filtres ne réclame AUCUN fondu", () => {
		const navigations = RAIL_HOOK.match(/router\.(push|replace)\([^;]*?\);/g) ?? [];

		expect(navigations.length).toBeGreaterThan(0);
		for (const navigation of navigations) {
			expect(
				navigation,
				"Le retour d'attente du rail est `data-pending`, pas un fondu.",
			).not.toContain("PAGE_FADE");
		}
	});

	it("les valeurs littérales sont celles que le CSS et les tests attendent", () => {
		expect(PAGE_CONTENT_VIEW_TRANSITION_NAME).toBe("page-content");
		expect(PAGE_FADE_TRANSITION_TYPE).toBe("page-fade");
	});
});
