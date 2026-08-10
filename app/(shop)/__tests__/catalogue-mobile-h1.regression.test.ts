/**
 * @regression catalogue-mobile-h1
 *
 * Chaque surface catalogue doit exposer un `h1` en mobile.
 *
 * ## Un seul montage depuis l'harmonisation du storefront
 *
 * L'invariant est « la page a exactement un `h1`, et il existe sous 40rem ».
 * Le montage historique (`PageHeader` masqué sous `sm` + repli `h1`
 * `sr-only sm:hidden`) a disparu avec l'harmonisation sur « L'étal continue » :
 * toutes les surfaces storefront portent désormais un bloc titre
 * (`StorefrontHeading`) dont le `h1` est **visible à tous les viewports**.
 * Le repli `sr-only` reposait sur une prémisse tombée dès 2026-07-26 (plus
 * d'onglet « Produits » en bottom-bar) : la page n'affichait plus un seul mot
 * en mobile — un `h1` masqué et rien d'autre.
 *
 * Test statique sur les sources plutôt que rendu : ces pages sont des Server
 * Components qui résolvent `searchParams` et des promesses de données ; les
 * monter demanderait de simuler tout ça pour vérifier une seule balise.
 *
 * ⚠️ En E2E, ne PAS asserter un `h1` `sr-only` avec `toBeVisible()` : `.sr-only`
 * reste « visible » pour Playwright (positionné hors écran, pas masqué).
 * Utiliser `getByRole("heading", { level: 1 })`.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

/**
 * Fichiers qui se substituent À la page au lieu de composer AVEC elle : leur
 * `h1` n'est jamais co-rendu avec celui de l'étal, et le leur est légitime — un
 * écran d'erreur sans titre ne dirait plus rien.
 */
const PAGE_SUBSTITUTES = new Set(["error.tsx", "not-found.tsx", "global-error.tsx"]);

/**
 * Tous les `.tsx` sous un dossier — tests et substituts de page exclus. Sert à
 * compter les porteurs de `h1` de la landing SANS liste à maintenir : une
 * nouvelle section de la home (l'atelier, les collections…) entre dans le
 * périmètre du jour où elle est écrite, pas du jour où quelqu'un pense à
 * l'ajouter ici.
 */
function walkTsx(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === "__tests__" ? [] : walkTsx(full);
		if (!entry.name.endsWith(".tsx")) return [];
		if (entry.name.includes(".test.") || PAGE_SUBSTITUTES.has(entry.name)) return [];
		return [full];
	});
}

/**
 * Le montage — bloc titre `StorefrontHeading`, `h1` visible partout.
 *
 * Depuis l'harmonisation du storefront, le `h1` vit dans le composant partagé
 * `StorefrontHeading` ; `CatalogHeading` n'est plus qu'un wrapper catalogue
 * (copies, compteur, accent par famille) qui n'a pas le droit de déclarer un
 * `h1` concurrent.
 */
const STOREFRONT_HEADING = "shared/components/storefront-heading.tsx";
const CATALOG_HEADING = "modules/products/components/catalog-heading.tsx";
const CATALOG_SHELL = "modules/products/components/product-catalog.tsx";

/**
 * Pages migrées sur le montage 2 lors de l'harmonisation du storefront : elles
 * montent `StorefrontHeading` directement et ne déclarent aucun `h1` en propre.
 * Étendue lot par lot.
 */
const MIGRATED_SHELL_SURFACES = [
	"app/(shop)/collections/[slug]/page.tsx",
	"app/(shop)/collections/page.tsx",
	"app/(shop)/favoris/page.tsx",
	// Plus d'`app/(shop)/aide/page.tsx` : la route a été supprimée le 2026-08-05
	// (FAQ absorbée par la landing), puis la section FAQ elle-même le 2026-08-08
	// (à refaire) avec l'ancre `/#faq` et sa redirection. Le `h1` de l'accueil
	// reste celui de l'étal — cf. l'assertion « la landing garde UN seul h1 ».
];

describe("catalogue — h1 en mobile (@regression catalogue-mobile-h1)", () => {
	describe("le storefront porte un h1 VISIBLE partout", () => {
		it("le bloc titre déclare un h1, et il n'est pas masqué par un breakpoint", () => {
			const source = read(STOREFRONT_HEADING);
			const headings = source.match(/<h1[\s\S]*?>/g);

			expect(headings).toHaveLength(1);

			// Ni `sr-only`, ni `hidden` : c'est tout l'objet du changement de montage —
			// la page doit dire son nom sous 40rem, où elle n'affichait plus rien.
			expect(headings![0]).not.toMatch(/\bsr-only\b/);
			expect(headings![0]).not.toMatch(/\bhidden\b/);

			// Le wrapper catalogue ne déclare aucun h1 en propre : un second h1
			// ferait échouer les E2E en mode strict (`getByRole("heading")`).
			expect(read(CATALOG_HEADING).match(/<h1\b/g)).toBeNull();
		});

		it("le shell ne rend plus de PageHeader et ne déclare aucun h1 concurrent", () => {
			const source = read(CATALOG_SHELL);

			// Un `PageHeader` réintroduit ramènerait le doublon de h1 ET le second
			// `BreadcrumbList` (cf. @regression catalogue-single-breadcrumb).
			expect(source).not.toMatch(/<PageHeader\b/);
			expect(source.match(/<h1\b/g)).toBeNull();
		});

		it.each(MIGRATED_SHELL_SURFACES)(
			"%s monte StorefrontHeading et ne déclare aucun h1 en propre",
			(path) => {
				const source = read(path);

				// Le h1 vient du composant partagé — visible partout par construction.
				// Un h1 déclaré dans la page en ferait deux (mode strict Playwright).
				expect(source).toMatch(/<StorefrontHeading\b/);
				expect(source.match(/<h1\b/g)).toBeNull();
				expect(source).not.toMatch(/<PageHeader\b/);
			},
		);

		/**
		 * La landing accueille des sections successives (l'étal, la FAQ depuis le
		 * 2026-08-05, l'atelier et les collections à venir). Chacune est un
		 * `<section aria-labelledby>` — et c'est exactement là qu'un second `h1`
		 * se glisse : « Des questions ? » a l'air d'un titre de page quand on
		 * l'écrit isolément, alors que le `h1` de `/` appartient à l'étal.
		 *
		 * Un second `h1` ne casse rien à l'œil : il fait échouer les E2E en mode
		 * strict (`getByRole("heading", { level: 1 })`) et brouille la hiérarchie
		 * pour un lecteur d'écran.
		 */
		it("la landing garde UN seul h1, celui de l'étal", () => {
			// ⚠️ `(?<!`)` est indispensable : la home et ses composants PARLENT du
			// `<h1>` dans leurs JSDoc (« il ne retarde jamais le `<h1>` »), et un
			// `/<h1\b/` nu compte ces mentions comme des déclarations. On exclut donc
			// les occurrences précédées d'un backtick — la convention du dépôt étant
			// de toujours entourer le code cité de backticks.
			const DECLARED_H1 = /(?<!`)<h1\b/g;

			const declarers = walkTsx(join(ROOT, "app", "(shop)", "(home)"))
				.map((file) => ({
					file,
					count: (readFileSync(file, "utf8").match(DECLARED_H1) ?? []).length,
				}))
				.filter(({ count }) => count > 0);

			// Prémisse anti-vacuité : le walk trouve bien des fichiers.
			expect(walkTsx(join(ROOT, "app", "(shop)", "(home)")).length).toBeGreaterThan(5);

			expect(
				declarers.map(({ file, count }) => `${file.slice(ROOT.length + 1)} → ${count}`),
				"la landing doit déclarer EXACTEMENT un h1, dans le bloc titre de l'étal",
			).toEqual(["app/(shop)/(home)/_components/hero/hero-heading.tsx → 1"]);

			/*
			 * ⚠️ Les deux assertions sur la section FAQ (un `h2`, et des questions au
			 * cran juste en dessous via `headingLevel={3}`) sont parties le
			 * 2026-08-08 avec la section, à refaire.
			 *
			 * Ce qu'elles apprenaient, à re-appliquer telles quelles quand elle
			 * revient : l'invariant est la CONTIGUÏTÉ avec le `h2`, jamais le
			 * chiffre. Les questions ont tenu des `h4` tant que cinq intertitres de
			 * groupe occupaient les `h3` ; le regroupement retiré, garder `h4`
			 * faisait sauter un cran — exactement le défaut que ce test verrouille.
			 */
		});

		it("la PDP porte son h1 dans ProductInfo, visible partout", () => {
			// La fiche produit ne monte pas StorefrontHeading (elle a déjà son
			// identité : eyebrow type + provenance) — son h1 vit dans ProductInfo.
			// L'ancien montage le partageait entre un PageHeader desktop masqué en
			// mobile et un repli `sr-only sm:hidden` : deux porteurs pour un titre.
			const productInfo = read("modules/products/components/product-info.tsx");
			const headings = productInfo.match(/<h1[\s\S]*?>/g);

			expect(headings).toHaveLength(1);
			expect(headings![0]).not.toMatch(/\bsr-only\b/);
			expect(headings![0]).not.toMatch(/\bhidden\b/);

			const pdp = read("app/(shop)/creations/[slug]/page.tsx");
			expect(pdp.match(/<h1\b/g)).toBeNull();
			expect(pdp).not.toMatch(/<PageHeader\b/);
		});

		it("le h2 masqué du bloc titre nomme la même liste que la grille", () => {
			// Deux libellés divergents pour un seul ensemble (« Liste des créations »
			// côté titre, « Liste des produits » côté grille) laissaient un lecteur
			// d'écran entendre deux noms pour la même chose. Le mécanisme (h2 sr-only)
			// vit dans le composant partagé ; le LIBELLÉ catalogue reste verrouillé
			// chez son wrapper — le réutiliser tel quel sur /favoris ou /collections
			// serait sémantiquement faux.
			// Regex tolérante au reformatage (attributs multi-lignes, ordre) : la
			// chaîne JSX exacte cassait à tout passage de Prettier sans que rien
			// n'ait régressé. Ce qui compte : un h2 sr-only alimenté par listLabel.
			expect(read(STOREFRONT_HEADING)).toMatch(
				/<h2[^>]*className="sr-only"[^>]*>\s*\{listLabel\}\s*<\/h2>/,
			);
			expect(read(CATALOG_HEADING)).toContain('listLabel="Liste des créations"');
			expect(read("modules/products/components/product-list.tsx")).not.toContain(
				"Liste des produits",
			);
		});
	});
});
