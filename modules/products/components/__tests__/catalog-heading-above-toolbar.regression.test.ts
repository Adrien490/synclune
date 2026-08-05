/**
 * @regression catalog-heading-above-toolbar
 *
 * Re-tranché par l'user le 2026-08-05 : le bloc titre du catalogue est
 * l'**en-tête de page**, hors de la grille des produits et AVANT la barre
 * d'outils. Le montage précédent (« L'étal continue ») le rendait première
 * cellule de `CATALOG_GRID` — deux défauts jugés illogiques :
 *
 * - dans l'ordre DOM, le `h1` arrivait APRÈS la barre de tri/recherche et après
 *   le `h2` « Filtres » du rail (hiérarchie de titres inversée à `lg`) ;
 * - à `lg`, le titre partageait sa rangée avec la première carte produit.
 *
 * Ordre verrouillé : fil d'Ariane → bloc titre → barre → [rail | grille], sur
 * les DEUX shells (/produits via `ProductCatalog`, /collections/[slug] en
 * direct) et leurs squelettes miroirs — une position qui bouge d'un seul côté
 * est un CLS au swap `loading.tsx` → page, sur des routes dont le CLS est
 * budgété en CI (`e2e/performance.spec.ts`).
 *
 * Lit la SOURCE, pas le rendu : l'appartenance à la grille est une question de
 * position JSX, invisible à jsdom (pas de layout).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const read = (relativePath: string) =>
	stripComments(readFileSync(join(REPO_ROOT, relativePath), "utf-8"));

/**
 * Vérifie l'ordre `first` avant `second` dans un fichier, chaque marqueur
 * devant exister — un marqueur absent ferait passer un `indexOf` naïf (-1 <
 * tout) alors que la structure a disparu.
 */
function expectBefore(source: string, file: string, first: string, second: string) {
	const firstIndex = source.indexOf(first);
	const secondIndex = source.indexOf(second);
	expect(firstIndex, `\`${first}\` introuvable dans ${file}`).toBeGreaterThan(-1);
	expect(secondIndex, `\`${second}\` introuvable dans ${file}`).toBeGreaterThan(-1);
	expect(firstIndex, `dans ${file}, \`${first}\` doit apparaître AVANT \`${second}\``).toBeLessThan(
		secondIndex,
	);
}

describe("@regression catalog-heading-above-toolbar", () => {
	const shell = read("modules/products/components/product-catalog.tsx");
	const shellSkeleton = read("modules/products/components/product-catalog-skeleton.tsx");
	const collectionPage = read("app/(shop)/collections/[slug]/page.tsx");
	const collectionLoading = read("app/(shop)/collections/[slug]/loading.tsx");

	it("le shell /produits monte le bloc titre AVANT la barre d'outils", () => {
		expectBefore(shell, "product-catalog.tsx", "<CatalogHeading", "<ProductSortBar");
	});

	it("le shell /produits monte le bloc titre AVANT le cluster recherche/tri de sa rangée", () => {
		expectBefore(shell, "product-catalog.tsx", "<CatalogHeading", "<CatalogToolbarInline");
	});

	it("la barre ne monte plus AUCUN champ de recherche (une seule instance de SearchInput)", () => {
		// Un corps monté deux fois partage ses `id` (`<label htmlFor>` résout vers
		// la première occurrence, même masquée) et fait échouer le strict mode
		// Playwright (`e2e/pages/search.page.ts` attend UN `role="searchbox"`).
		// Depuis le retour user du 2026-08-05, le champ vit dans la rangée titre
		// (`CatalogToolbarInline`) — la barre n'en remonte jamais un second.
		const sortBar = read("modules/products/components/product-sort-bar.tsx");
		expect(
			sortBar.includes("<SearchInput"),
			"product-sort-bar.tsx ne doit plus monter de `<SearchInput` — le champ vit dans `CatalogToolbarInline`.",
		).toBe(false);
	});

	it("le shell /produits monte le bloc titre HORS de la grille", () => {
		// La grille (et tout le montage rail + liste) vient après le bloc titre :
		// le titre n'est plus une cellule de `CATALOG_GRID`.
		expectBefore(shell, "product-catalog.tsx", "<CatalogHeading", "className={CATALOG_GRID}");
	});

	it("le squelette /produits miroite la position (bloc titre avant la barre, hors grille)", () => {
		expectBefore(
			shellSkeleton,
			"product-catalog-skeleton.tsx",
			"<CatalogHeadingSkeleton",
			"cn(SHELF_BAR_SHELL",
		);
		expectBefore(
			shellSkeleton,
			"product-catalog-skeleton.tsx",
			"<CatalogHeadingSkeleton",
			"className={CATALOG_GRID}",
		);
	});

	it("/collections/[slug] monte le bloc titre AVANT la grille", () => {
		expectBefore(
			collectionPage,
			"collections/[slug]/page.tsx",
			"<StorefrontHeading",
			"className={CATALOG_GRID}",
		);
	});

	it("le loading de /collections/[slug] miroite la position", () => {
		expectBefore(
			collectionLoading,
			"collections/[slug]/loading.tsx",
			"<StorefrontHeadingSkeleton",
			"className={CATALOG_GRID}",
		);
	});

	it("plus aucun col-span sur le bloc titre (il n'est plus une cellule)", () => {
		for (const [file, source] of [
			["product-catalog.tsx", shell],
			["catalog-heading.tsx", read("modules/products/components/catalog-heading.tsx")],
			["collections/[slug]/page.tsx", collectionPage],
			["collections/[slug]/loading.tsx", collectionLoading],
		] as const) {
			expect(
				/col-span/.test(source),
				`${file} ne doit plus poser de \`col-span\` — le bloc titre vit hors de la grille.`,
			).toBe(false);
		}
	});
});
