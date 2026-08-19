import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { TAXONOMY_CONFIG } from "../../config/taxonomy.config";
import type { TaxonomyKind } from "../../types/taxonomy.types";

/**
 * @regression taxonomy-filters-are-parsed-2026-08-19
 *
 * La feuille de filtres des taxonomies écrivait `filter_isActive` sur les trois
 * listes admin. Or la migration lean avait retiré la colonne `active` de
 * `Color`, `Material` et `ProductType`, et **aucune page ne lisait ce
 * paramètre** : `couleurs/page.tsx` et `materiaux/page.tsx` codaient
 * `const filters = {}` en dur, et `types-de-produits/_utils/params.ts` ne
 * parsait que `hasProducts`.
 *
 * Le résultat n'était pas « un filtre sans effet », c'était une interface qui
 * ment sur trois plans à la fois :
 *
 *  - la liste ne bougeait pas alors qu'un filtre semblait appliqué ;
 *  - le badge affichait la clé technique (« isActive : true ») parce que
 *    `TaxonomyFilterBadges` comparait le suffixe à `"active"` ;
 *  - `hasActiveFilters` basculait, donc l'état vide annonçait « ne correspond
 *    aux critères de recherche » et proposait « Réinitialiser les filtres »
 *    pour une liste qu'aucun critère n'avait touchée.
 *
 * Rien de tout cela n'est visible au typecheck ni au lint : un paramètre d'URL
 * n'a pas de type. **La seule garde possible est de vérifier les deux bouts** —
 * ce que la feuille écrit, et ce que la page lit — d'où ce test sur les
 * sources.
 *
 * Symétrique volontaire : le sens inverse (un filtre parsé qu'aucune UI ne
 * produit) était vrai aussi, `hasProducts` étant supporté par la couche data et
 * la page sans jamais avoir eu de déclencheur.
 */

const REPO_ROOT = process.cwd();

/** Fichiers qui, pour une taxonomie, transforment `searchParams` en `filters`. */
const PARSE_SOURCES: Record<TaxonomyKind, string[]> = {
	color: ["app/admin/(protected)/catalogue/couleurs/page.tsx"],
	material: ["app/admin/(protected)/catalogue/materiaux/page.tsx"],
	"product-type": [
		"app/admin/(protected)/catalogue/types-de-produits/page.tsx",
		"app/admin/(protected)/catalogue/types-de-produits/_utils/params.ts",
	],
};

/** Surfaces de filtre montées par une page — aucune ne doit l'être sans filtre. */
const FILTER_SURFACES = ["TaxonomyFilterBadges", "FilterTriggerButton", "TaxonomyFilterSheet"];

const KINDS = Object.keys(TAXONOMY_CONFIG) as TaxonomyKind[];

function read(relativePath: string): string {
	return readFileSync(join(REPO_ROOT, relativePath), "utf-8");
}

function readAll(relativePaths: string[]): string {
	return relativePaths.map(read).join("\n");
}

describe("Filtres des taxonomies — ce qui est écrit est lu", () => {
	it("le périmètre scanné n'est pas vide", () => {
		// Un chemin de page renommé ferait passer tout ce fichier au vert à blanc.
		expect(KINDS).toHaveLength(3);
		for (const kind of KINDS) {
			expect(PARSE_SOURCES[kind].length).toBeGreaterThan(0);
			expect(readAll(PARSE_SOURCES[kind])).toContain("searchParams");
		}
	});

	it.each(KINDS)("%s : chaque filtre déclaré est parsé par sa page", (kind) => {
		const config = TAXONOMY_CONFIG[kind];
		const source = readAll(PARSE_SOURCES[kind]);

		for (const filter of config.filters) {
			expect(
				source,
				`Le registre déclare le filtre « ${filter.param} » pour ${kind}, mais ` +
					`${PARSE_SOURCES[kind].join(" / ")} ne le lit nulle part.`,
			).toContain(filter.param);
		}
	});

	it.each(KINDS)("%s : chaque filtre parsé est déclaré au registre", (kind) => {
		const declared = new Set(TAXONOMY_CONFIG[kind].filters.map((filter) => filter.param));
		const source = readAll(PARSE_SOURCES[kind]);

		// Forme de parse du dépôt : `filterKey === "hasProducts"` après retrait du
		// préfixe, ou `params.filter_hasProducts` en accès direct.
		const parsed = new Set<string>();
		for (const match of source.matchAll(/filterKey === "(\w+)"/g)) parsed.add(match[1]!);
		for (const match of source.matchAll(/params\.filter_(\w+)/g)) parsed.add(match[1]!);

		for (const param of parsed) {
			expect(
				declared.has(param),
				`${kind} parse le filtre « ${param} », qu'aucune UI ne produit : ` +
					`déclare-le dans TAXONOMY_CONFIG.${kind}.filters ou retire le parse.`,
			).toBe(true);
		}
	});

	it.each(KINDS.filter((kind) => TAXONOMY_CONFIG[kind].filters.length === 0))(
		"%s : sans filtre déclaré, la page ne monte aucune surface de filtre",
		(kind) => {
			const source = readAll(PARSE_SOURCES[kind]);

			for (const surface of FILTER_SURFACES) {
				expect(
					source,
					`${kind} ne déclare aucun filtre : ${surface} promettrait une action sans effet.`,
				).not.toContain(surface);
			}
		},
	);

	it("la feuille ne fabrique aucune clé de filtre en dur", () => {
		const source = read("modules/taxonomies/components/taxonomy-filter-sheet.tsx")
			.split("\n")
			.filter((line) => {
				const trimmed = line.trimStart();
				return !(trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*"));
			})
			.join("\n");

		// Les clés se composent depuis `config.filters` ; un littéral `filter_xxx`
		// serait précisément la dérive qui a produit `filter_isActive`.
		expect(source).not.toMatch(/"filter_\w+"/);
		expect(source).toContain("`filter_${filter.param}`");
	});
});
