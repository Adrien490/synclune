/**
 * @regression catalogue-single-breadcrumb
 *
 * Une URL ne doit publier qu'UN `BreadcrumbList` et qu'UN `ItemList`.
 *
 * `PageHeader` émet automatiquement un `BreadcrumbList` dès qu'on lui passe des
 * `breadcrumbs` (`shared/components/page-header.tsx`, opt-out `noStructuredData`).
 * C'est ce double émetteur (`PageHeader` + JSON-LD de page) qui publiait deux
 * `BreadcrumbList` par URL sur /produits, /produits/[type] et /collections/[slug].
 * Depuis l'harmonisation du storefront sur « L'étal continue », plus AUCUNE page
 * boutique ne rend de `PageHeader` : le fil d'Ariane visuel est `BreadcrumbNav`
 * (zéro JSON-LD), et le balisage appartient au seul émetteur page-level.
 * `PageHeader` survit pour les pages légales et l'admin.
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
 * Surfaces migrées sur le shell « L'étal continue » : plus de `PageHeader` du
 * tout, fil d'Ariane visuel via `BreadcrumbNav`, au plus UN émetteur
 * `BreadcrumbList` dans la source de page (0 quand un générateur `_utils/`
 * l'émet, ou quand la page est noindex). Étendue lot par lot pendant
 * l'harmonisation du storefront.
 */
const MIGRATED_SHELL_SURFACES = [
	"app/(shop)/collections/[slug]/page.tsx",
	"app/(shop)/collections/page.tsx",
	"app/(shop)/favoris/page.tsx",
	"app/(shop)/creations/[slug]/page.tsx",
	// Plus d'`app/(shop)/aide/page.tsx` : la FAQ a rejoint la landing le
	// 2026-08-05 et la route a été supprimée (redirection 308 vers `/#faq`).
	// Son `BreadcrumbList` page-level est parti avec elle ; c'est désormais
	// l'accueil qui héberge la FAQ, et son unicité est couverte par
	// « l'accueil n'émet qu'UN script… » plus bas.
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
	it.each(MIGRATED_SHELL_SURFACES)(
		"%s ne rend plus de PageHeader et monte BreadcrumbNav",
		(path) => {
			const source = read(path);

			// Ré-introduire `PageHeader` avec des `breadcrumbs` republierait un second
			// `BreadcrumbList` — le défaut d'origine.
			expect(source).not.toMatch(/<PageHeader\b/);
			expect(source).toMatch(/<BreadcrumbNav\b/);

			// Au plus UN émetteur `BreadcrumbList` dans la source de page (celui du
			// script page-level, quand le balisage n'est pas délégué à un générateur).
			expect((source.match(/"@type":\s*"BreadcrumbList"/g) ?? []).length).toBeLessThanOrEqual(1);
		},
	);

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
		expect(source).toMatch(/<BreadcrumbNav\b/);
	});

	it("BreadcrumbNav est un fil d'Ariane VISUEL — aucun JSON-LD, jamais", () => {
		const source = read("shared/components/breadcrumb-nav.tsx");

		// Le composant partagé sert toutes les surfaces migrées : s'il se mettait
		// à émettre un `BreadcrumbList`, CHAQUE page en publierait deux d'un coup.
		expect(source).not.toContain("application/ld+json");
		expect(source).not.toContain("safeJsonLd");
		expect(source).not.toContain("<script");
		expect(source).not.toMatch(/"@type":\s*"BreadcrumbList"/);

		// Prémisse anti-vacuité : c'est bien lui qui porte le nav étiqueté.
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

	/**
	 * L'accueil est le cas le plus chargé : il porte la `BreadcrumbList` de la
	 * home, l'`ItemList` de l'étal ET, depuis l'absorption de `/aide`
	 * (2026-08-05), le `FAQPage` de la section « Des questions ? ». Trois nœuds
	 * de types distincts, donc aucune ambiguïté pour Google — à condition qu'ils
	 * restent dans le MÊME `@graph`, avec un seul de chaque type.
	 *
	 * C'est précisément le trou que `/aide` avait : faute de générateur, elle
	 * émettait DEUX `<script>` (FAQPage + BreadcrumbList). Reproduire ce montage
	 * sur l'accueil — un second script pour la FAQ, à côté de `StructuredData` —
	 * y ajouterait une `BreadcrumbList` concurrente au premier copier-coller.
	 */
	it("l'accueil n'émet qu'UN script, et un seul nœud de chaque type", () => {
		const homePage = read("app/(shop)/(home)/page.tsx");
		const generator = read("shared/components/structured-data.tsx");

		// La page ne balise rien elle-même : elle délègue à `StructuredData`.
		expect(homePage).not.toContain("application/ld+json");
		expect(homePage).not.toContain("safeJsonLd");
		expect(homePage).toContain("StructuredData");

		// Un seul `<script>` dans le générateur, et un `@graph` — pas des scripts
		// juxtaposés.
		expect(generator.match(/application\/ld\+json/g)).toHaveLength(1);
		expect(generator).toContain('"@graph"');

		// Un nœud de chaque type, pas deux.
		for (const type of ["ItemList", "FAQPage"]) {
			expect(
				generator.match(new RegExp(`"@type":\\s*"${type}"`, "g")),
				`${type} doit apparaître exactement une fois dans le @graph de l'accueil`,
			).toHaveLength(1);
		}

		// ⚠️ `BreadcrumbList` fait exception, et l'assertion est INVERSÉE depuis le
		// 2026-08-06 : l'accueil n'en émet plus AUCUNE. Celle qu'il émettait n'avait
		// qu'un seul `ListItem` (« Accueil » → la racine), or Google en exige au
		// moins deux et demande d'omettre la racine comme la page courante — le fil
		// ne contenait donc que l'élément à omettre, et ne pouvait pas s'afficher.
		//
		// L'invariant que ce fichier garde reste entier : il interdit le DOUBLON sur
		// une même URL, il n'oblige personne à émettre un fil. Les pages profondes
		// gardent le leur, où il a bien ≥ 2 maillons.
		expect(
			generator.match(/"@type":\s*"BreadcrumbList"/g),
			"l'accueil ne doit émettre aucune BreadcrumbList (un fil à 1 item ne s'affiche jamais)",
		).toBeNull();

		// Prémisse anti-vacuité : la section FAQ que ce balisage décrit existe, et
		// son ancre est bien celle que cible la redirection de `/aide`.
		const faqSection = read("app/(shop)/(home)/_components/faq/faq-section.tsx");
		expect(faqSection).toContain('FAQ_SECTION_ID = "faq"');
		expect(read("next.config.ts")).toContain('source: "/aide", destination: "/#faq"');
	});

	it("PageHeader émet toujours son BreadcrumbList quand l'opt-out est absent", () => {
		const source = read("shared/components/page-header.tsx");

		// L'opt-out doit rester un opt-out : par défaut le balisage est émis, sinon
		// les pages légales perdraient silencieusement leur fil d'Ariane.
		expect(source).toContain("noStructuredData = false");
		expect(source).toContain("breadcrumbs.length > 0 && !noStructuredData");
	});
});
