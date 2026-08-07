/**
 * @regression catalog-grid-columns
 *
 * « Le plan de travail » (artifact filtres 2026-08-04, direction C, implémentée
 * le 2026-08-05) : à partir de `lg`, la colonne de gauche du catalogue
 * appartient au **rail de filtres** (16rem), et la grille des créations passe
 * de 4 à **3 colonnes**.
 *
 * C'est un arbitrage explicite, tranché par l'user : le rail coûte une colonne
 * de cartes, et en échange les cartes s'élargissent (~248 → ~277 px à 1280) et
 * on cesse de filtrer derrière un scrim. Le critère d'échec de la direction est
 * inverse et connu : « si Léane tient à ses quatre colonnes, le rail tombe ».
 *
 * Ce garde-fou empêche donc les deux dérives silencieuses :
 * - rétablir `lg:grid-cols-4` **sans** retirer le rail — au-delà du plafond
 *   `max-w-6xl`, une colonne de plus RÉTRÉCIT les cartes au lieu de les
 *   élargir (le JSDoc de la SSOT le documentait déjà pour `2xl:grid-cols-5`) ;
 * - retirer le wrapper à deux colonnes en laissant la grille à 3, ce qui
 *   donnerait une grille étroite sans rien à sa gauche.
 *
 * Lit la SOURCE, pas le rendu : la géométrie vit dans des constantes de
 * classes Tailwind, jamais mesurables en jsdom.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = join(__dirname, "..");

/**
 * Retire les commentaires avant de scanner : les JSDoc de la SSOT citent
 * nommément les classes bannies (`lg:grid-cols-4`, `2xl:grid-cols-5`) pour
 * expliquer POURQUOI elles le sont. Sans ce dépouillement, le test échoue sur
 * sa propre documentation — et l'« adapter » en effaçant ces explications
 * reviendrait à perdre l'arbitrage.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const read = (file: string) => stripComments(readFileSync(join(COMPONENTS_DIR, file), "utf-8"));

const GRID_CONSTANTS = read("catalog-grid.constants.ts");
const CATALOG_SHELL = read("product-catalog.tsx");
const CATALOG_SKELETON = read("product-catalog-skeleton.tsx");

/** Le wrapper qui pose [rail | contenu] — écrit à l'identique dans les deux fichiers. */
const RAIL_WRAPPER = "lg:grid-cols-[16rem_1fr]";

describe("@regression catalog-grid-columns", () => {
	it("la grille plafonne à 3 colonnes à lg", () => {
		expect(
			GRID_CONSTANTS.includes("lg:grid-cols-3"),
			"CATALOG_GRID doit rester à `lg:grid-cols-3` — le rail occupe la 4ᵉ colonne.",
		).toBe(true);
	});

	it("ne réintroduit ni 4 colonnes à lg, ni palier 2xl", () => {
		expect(
			GRID_CONSTANTS.includes("lg:grid-cols-4"),
			"`lg:grid-cols-4` avec le rail en place rétrécit les cartes (conteneur capé `max-w-6xl`).",
		).toBe(false);
		expect(
			/2xl:grid-cols-/.test(GRID_CONSTANTS),
			"un palier `2xl:` répartit le même espace en plus de parts — le conteneur ne grandit pas.",
		).toBe(false);
	});

	it("le shell rend le rail dans un wrapper à deux colonnes", () => {
		expect(CATALOG_SHELL).toContain(RAIL_WRAPPER);
		expect(
			CATALOG_SHELL.includes("<ProductFilterRail"),
			"le rail doit être monté par le shell — sinon la grille à 3 colonnes n'a rien à sa gauche.",
		).toBe(true);
	});

	it("le rail vit SOUS le conteneur qui porte group/container", () => {
		// Le grisage `data-pending` de la grille est un
		// `group-has-[[data-pending]]/container` : un rail rendu hors de
		// `#product-container` (comme le panneau portalisé) ne peut pas l'activer.
		const containerIndex = CATALOG_SHELL.indexOf("group/container");
		const railIndex = CATALOG_SHELL.indexOf("<ProductFilterRail");
		expect(containerIndex).toBeGreaterThan(-1);
		expect(
			railIndex,
			"`<ProductFilterRail` doit apparaître APRÈS l'ouverture de `group/container`.",
		).toBeGreaterThan(containerIndex);
	});

	it("le squelette miroite le wrapper du rail (budget CLS de la route)", () => {
		expect(
			CATALOG_SKELETON.includes(RAIL_WRAPPER),
			"sans ce miroir, la grille du squelette est pleine largeur et saute de 16rem au swap Suspense.",
		).toBe(true);
	});

	it("la barre Filtrer s'efface à lg (le rail la remplace)", () => {
		// Depuis le retrait du tri et de la recherche de la barre (2026-08-06),
		// le gate n'est plus sur le bouton mais sur la coque entière : la barre
		// n'a qu'un geste (« Filtrer »), et le rail déplié le couvre à `lg`.
		const filterBar = read("product-filter-bar.tsx");
		const shelfBarIndex = filterBar.indexOf("<ShelfBar ");
		expect(shelfBarIndex, "coque ShelfBar introuvable dans product-filter-bar.tsx").toBeGreaterThan(
			-1,
		);
		const shelfBarTag = filterBar.slice(shelfBarIndex, filterBar.indexOf(">", shelfBarIndex));
		expect(
			shelfBarTag.includes("lg:hidden"),
			"deux entrées pour un seul geste : un bouton qui ouvre un panneau par-dessus le rail déplié.",
		).toBe(true);
	});
});
