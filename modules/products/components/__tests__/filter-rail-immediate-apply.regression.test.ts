/**
 * @regression filter-rail-immediate-apply
 *
 * Le rail de filtres desktop applique **à la coche** : pas de bouton
 * « Appliquer », pas de scrim, la grille se recompose derrière. Trois
 * propriétés portent ce contrat, et chacune est invisible à `tsc` :
 *
 * 1. **`data-pending` sur la racine du rail.** C'est le SEUL lien avec le
 *    grisage `CATALOG_PENDING_DIM` (`group-has-[[data-pending]]/container`)
 *    posé cellule par cellule sur la grille. Sans lui, appliquer un filtre ne
 *    donne aucun retour visuel — c'est précisément le trou du panneau, dont le
 *    `SheetContent` portalisé vivait hors de `group/container`.
 * 2. **Aucune View Transition, aucun scroll programmé.** Le rail est collé à
 *    côté de la grille : rien ne se déplace, donc `scrollToProductsGrid()`
 *    déplacerait la vue sans raison, et une VT sur fermeture de panneau est un
 *    refus déjà exprimé.
 * 3. **`{ scroll: false }` sur toute navigation.** Un `push`/`replace` qui
 *    remonte en haut de page à chaque coche rendrait le rail inutilisable une
 *    fois descendu dans la grille.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Retire les commentaires avant de scanner.
 *
 * ⚠️ Indispensable ici : les commentaires des fichiers visés NOMMENT
 * précisément ce qui est interdit (« pas de `withViewTransition` », « pas de
 * bouton Appliquer ») — c'est même leur raison d'être. Scanner le fichier brut
 * fait échouer le test sur sa propre documentation, et le « corriger » en
 * effaçant les commentaires détruirait l'explication du contrat.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const read = (...segments: string[]) =>
	stripComments(readFileSync(join(__dirname, ...segments), "utf-8"));

const RAIL = read("..", "product-filter-rail.tsx");
const HOOK = read("..", "..", "hooks", "use-immediate-product-filters.ts");

describe("@regression filter-rail-immediate-apply", () => {
	it("le rail publie data-pending (seul lien avec le grisage de la grille)", () => {
		expect(
			/data-pending=\{isPending \? "" : undefined\}/.test(RAIL),
			"sans `data-pending`, une application de filtre au rail n'a aucun retour visuel.",
		).toBe(true);
	});

	it("le rail n'a pas de bouton Appliquer", () => {
		expect(
			/Appliquer|applyButtonText/.test(RAIL),
			"le rail applique à la coche : un bouton d'application y serait un état mort.",
		).toBe(false);
	});

	it("ni View Transition ni scroll programmé au rail", () => {
		for (const source of [RAIL, HOOK]) {
			expect(source.includes("withViewTransition")).toBe(false);
			expect(source.includes("scrollToProductsGrid")).toBe(false);
		}
	});

	it("toute navigation du rail passe scroll: false", () => {
		const navigations = HOOK.match(/router\.(push|replace)\([^)]*\)/g) ?? [];
		expect(
			navigations.length,
			"aucune navigation trouvée — le hook a été renommé ?",
		).toBeGreaterThan(0);
		for (const call of navigations) {
			expect(
				call.includes("scroll: false"),
				`\`${call}\` sans \`{ scroll: false }\` : chaque coche remonterait en haut de page.`,
			).toBe(true);
		}
	});

	it("push quand le PATH change, replace sinon (historique utilisable)", () => {
		// `/produits` ↔ `/produits/[slug]` est un vrai changement de page, que le
		// bouton Retour doit défaire ; un raffinement de filtre ne doit pas empiler
		// une entrée par coche.
		expect(HOOK).toMatch(/targetPath !== pathname/);
		expect(HOOK).toMatch(/router\.push/);
		expect(HOOK).toMatch(/router\.replace/);
	});

	it("la confirmation d'effacement reste un AlertDialog rendu dans l'arbre du rail", () => {
		expect(RAIL).toContain("<AlertDialog");
		expect(RAIL).toContain("Effacer tous les filtres ?");
		expect(
			/Drawer|Sheet/.test(RAIL),
			"refus déjà exprimé : une confirmation est un AlertDialog à tous les viewports.",
		).toBe(false);
	});

	it("le rail est gaté en CSS, jamais par une media query JS", () => {
		expect(RAIL).toContain("hidden lg:block");
		expect(
			/useMediaQuery|matchMedia/.test(RAIL),
			"gater le montage du rail en JS créerait un écart d'hydratation ; ses données viennent du serveur.",
		).toBe(false);
	});
});
