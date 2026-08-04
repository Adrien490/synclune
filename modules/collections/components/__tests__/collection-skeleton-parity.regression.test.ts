/**
 * @regression collection-skeleton-parity
 *
 * Le squelette de `/collections` doit recouvrir la grille qu'il annonce. Deux
 * dérives constatées à l'audit CollectionCard du 2026-08-04, toutes deux
 * invisibles au typecheck comme à la relecture :
 *
 * 1. **La chaîne de colonnes avait divergé.** Grille et squelette portaient
 *    chacun leur littéral ; corriger les paliers dans l'un laissait l'autre
 *    dessiner une grille différente pendant tout le chargement.
 * 2. **Le squelette ne réservait qu'UNE ligne de titre.** À 163px de large
 *    (2 colonnes dès 375px), un nom de collection wrappe presque toujours : la
 *    page sautait d'une ligne par carte à l'arrivée des données.
 *    `product-card-skeleton.tsx` avait déjà tranché ce même arbitrage — mesuré —
 *    en réservant deux lignes sous `sm` ; côté collections la conclusion était
 *    l'inverse, sans mesure.
 *
 * Ce test est volontairement SÉPARÉ de
 * `modules/products/components/__tests__/skeleton-card-ratio-parity.regression.test.ts` :
 * ce dernier verrouille un contrat de délégation propre à la famille produit
 * (un skeleton SSOT, N délégants sans `aspect-*` en propre), que la famille
 * collection ne suit pas — elle n'a qu'une seule surface.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = join(__dirname, "..");

/**
 * Retire commentaires de bloc et de ligne AVANT toute extraction.
 *
 * Sans ça le test se mordait la queue : les deux fichiers documentent en
 * commentaire les paliers qu'ils ont RETIRÉS (`xl:grid-cols-4`,
 * `2xl:grid-cols-5`), et l'extracteur les comptait comme du code — le
 * garde-fou échouait sur sa propre justification.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const GRID = stripComments(readFileSync(join(COMPONENTS_DIR, "collection-grid.tsx"), "utf-8"));
const SKELETON = stripComments(
	readFileSync(join(COMPONENTS_DIR, "collection-grid-skeleton.tsx"), "utf-8"),
);

/**
 * Jeu de classes du CONTENEUR de grille — le littéral `className` qui porte
 * `grid-cols-`, et lui seul.
 *
 * Ne pas ramasser tous les `gap-*` du fichier : le squelette porte aussi le
 * `gap-1.5` de la légende, que la grille délègue à la carte. Comparer les deux
 * fichiers entiers ferait échouer le test sur une différence légitime.
 */
function gridContainerClasses(source: string): Set<string> {
	const containers = [...source.matchAll(/"([^"]*grid-cols-[^"]*)"/g)].map((m) => m[1]!);
	return new Set(containers.flatMap((value) => value.split(/\s+/)).filter(Boolean));
}

describe("@regression collection-skeleton-parity", () => {
	it("la grille et son squelette déclarent exactement les mêmes colonnes et gouttières", () => {
		const fromGrid = gridContainerClasses(GRID);
		const fromSkeleton = gridContainerClasses(SKELETON);

		expect(
			fromGrid.size,
			"aucune classe de grille trouvée — le sélecteur a dû dériver",
		).toBeGreaterThan(3);
		expect([...fromSkeleton].sort()).toEqual([...fromGrid].sort());
	});

	it("aucun palier de colonnes au-delà de 3 : le conteneur est plafonné à max-w-6xl", () => {
		// `xl:grid-cols-4` faisait tomber les cartes de 341px à 248px (−27%) alors que
		// le conteneur ne grandit plus au-delà de 1152px. Même anti-pattern que le
		// `2xl:grid-cols-5` retiré de la grille produit — cf. docs/UI-CONVENTIONS.md.
		for (const [label, source] of [
			["collection-grid.tsx", GRID],
			["collection-grid-skeleton.tsx", SKELETON],
		] as const) {
			const columnCounts = [...source.matchAll(/grid-cols-(\d+)/g)].map((m) => Number(m[1]));
			expect(Math.max(...columnCounts), `${label} : plus de 3 colonnes`).toBeLessThanOrEqual(3);
		}
	});

	it("le squelette réserve DEUX lignes de titre sous sm, une seule au-dessus", () => {
		// Le titre est `text-base sm:text-lg` : 2 × 24px = h-12, puis 28px = sm:h-7.
		expect(
			SKELETON,
			"réserver une seule ligne de titre fait sauter la grille au chargement",
		).toMatch(/h-12[^"]*sm:h-7/);
	});
});
