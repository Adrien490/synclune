/**
 * @regression catalogue-single-breadcrumb
 *
 * Une URL ne doit publier qu'UN `BreadcrumbList` et qu'UN `ItemList`.
 *
 * `PageHeader` émet automatiquement un `BreadcrumbList` dès qu'on lui passe des
 * `breadcrumbs` (`shared/components/page-header.tsx`, opt-out `noStructuredData`). Les
 * trois surfaces catalogue injectent DÉJÀ leur propre JSON-LD contenant un
 * `BreadcrumbList` — elles doivent donc toutes passer l'opt-out. La PDP le faisait ;
 * /produits, /produits/[type] et /collections/[slug] ne le faisaient pas et publiaient
 * deux `BreadcrumbList` chacune.
 *
 * S'y ajoutait un second `ItemList` émis par `ProductList`, avec un `numberOfItems`
 * (total réel) différent de celui du JSON-LD de page (30 sérialisés). Google en retient
 * un arbitrairement ; le désaccord de comptage est un signal de qualité négatif. Celui de
 * `ProductList` a été retiré : l'`ItemList` de page reste imbriqué dans son
 * `CollectionPage` via `mainEntity`, la forme attendue sur une page de catégorie.
 *
 * Test statique sur les sources : monter l'arbre RSC de ces trois routes pour compter les
 * balises `script[type="application/ld+json"]` serait plus fidèle, mais demanderait de
 * simuler les Server Components, leurs `searchParams` et leurs promesses de données.
 * L'invariant tient sur deux faits vérifiables à la lecture — l'opt-out est passé, et
 * `ProductList` n'émet plus de JSON-LD — donc on les assert directement.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

/**
 * Isole l'élément JSX `<PageHeader ... />` d'une source.
 *
 * ⚠️ Indispensable : chercher `noStructuredData` dans la source ENTIÈRE passe au vert
 * sur le simple commentaire qui explique la présence du prop. Cette version du test a
 * été essayée, et elle restait verte après suppression du prop — un faux positif complet.
 * On extrait donc l'élément et on n'interroge que lui. Lève si l'élément est introuvable,
 * pour qu'un changement de forme du composant ne rende pas l'assertion vacuously true.
 */
function pageHeaderElement(source: string): string {
	const match = /<PageHeader\b[\s\S]*?\/>/.exec(source);
	if (!match) throw new Error("élément <PageHeader ... /> introuvable");
	return match[0];
}

/** Sources rendant un `PageHeader` avec `breadcrumbs`, en plus d'un JSON-LD de page. */
const SURFACES_WITH_PAGE_LEVEL_JSONLD = [
	"app/(shop)/collections/[slug]/page.tsx",
	"app/(shop)/creations/[slug]/page.tsx",
];

/**
 * Le shell du catalogue (`/produits` et `/produits/[productTypeSlug]`) ne figure
 * plus dans la liste ci-dessus : depuis la direction « L'étal continue »
 * (2026-08-05) il **ne rend plus de `PageHeader` du tout**. Son bloc titre est
 * une cellule de la grille, et son fil d'Ariane est un `<nav>` visuel sans
 * JSON-LD. L'opt-out n'a donc plus d'objet — mais l'invariant, lui, tient
 * toujours, et c'est cette voie-là qu'il faut garder fermée.
 */
const CATALOG_SHELL = "modules/products/components/product-catalog.tsx";

describe("catalogue — un seul BreadcrumbList par page (@regression catalogue-single-breadcrumb)", () => {
	it.each(SURFACES_WITH_PAGE_LEVEL_JSONLD)("%s passe noStructuredData à PageHeader", (path) => {
		const element = pageHeaderElement(read(path));

		expect(element).toContain("noStructuredData");
	});

	it("le shell du catalogue n'a AUCUN émetteur de BreadcrumbList concurrent", () => {
		const source = read(CATALOG_SHELL);

		// Ré-introduire `PageHeader` avec des `breadcrumbs` republierait un second
		// `BreadcrumbList` sur /produits et /produits/[type] — le défaut d'origine.
		expect(source).not.toMatch(/<PageHeader\b/);

		// Le fil d'Ariane visuel du shell ne doit pas se mettre à émettre du balisage
		// de son côté : le seul émetteur reste `buildCatalogJsonLd`, dont le
		// `BreadcrumbList` est déjà imbriqué dans son `CollectionPage`.
		expect(source).not.toMatch(/"@type":\s*"BreadcrumbList"/);
		expect(source).not.toContain("itemListElement");

		// Prémisse : il rend bien un fil d'Ariane VISUEL, sinon l'assertion
		// ci-dessus passerait au vert sur une page qui n'en a plus du tout.
		expect(source).toContain('aria-label="Fil d\'Ariane"');
	});

	it("ProductList n'émet plus de JSON-LD (l'ItemList vit dans le CollectionPage de la page)", () => {
		const source = read("modules/products/components/product-list.tsx");

		// On cible l'ÉMISSION, pas les mots : le fichier documente en commentaire pourquoi
		// il n'émet plus d'ItemList, et une assertion sur `ItemList` ou `numberOfItems`
		// nus se déclencherait sur cette explication.
		expect(source).not.toContain("application/ld+json");
		expect(source).not.toContain("safeJsonLd");
		expect(source).not.toContain("<script");
		expect(source).not.toMatch(/"@type":\s*"ItemList"/);
	});

	it("les pages catalogue gardent bien UN ItemList, dans leur mainEntity", () => {
		const catalogJsonLd = read("app/(shop)/produits/_utils/catalog.ts");
		const collectionJsonLd = read(
			"app/(shop)/collections/[slug]/_utils/generate-structured-data.ts",
		);

		for (const source of [catalogJsonLd, collectionJsonLd]) {
			expect(source).toContain("mainEntity");
			expect(source).toContain("ItemList");
			// Un seul `"@type": "ItemList"` par générateur.
			expect(source.match(/"@type":\s*"ItemList"/g)).toHaveLength(1);
		}
	});

	// Garde-fou du garde-fou : prouve que l'extraction sait échouer, donc que les
	// assertions ci-dessus interrogent bien un vrai élément JSX.
	it("l'extraction de l'élément lève quand PageHeader est absent", () => {
		expect(() => pageHeaderElement("const x = 1; // noStructuredData")).toThrow(/introuvable/);
	});

	it("PageHeader émet toujours son BreadcrumbList quand l'opt-out est absent", () => {
		const source = read("shared/components/page-header.tsx");

		// L'opt-out doit rester un opt-out : par défaut le balisage est émis, sinon les
		// pages hors catalogue (aide, légal…) perdraient silencieusement leur fil d'Ariane.
		expect(source).toContain("noStructuredData = false");
		expect(source).toContain("breadcrumbs.length > 0 && !noStructuredData");
	});
});
