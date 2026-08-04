/**
 * @regression catalogue-mobile-h1
 *
 * Chaque surface catalogue doit exposer un `h1` en mobile.
 *
 * ## Deux montages, un seul invariant
 *
 * L'invariant est « la page a exactement un `h1`, et il existe sous 40rem ».
 * Deux façons de l'honorer coexistent dans le dépôt :
 *
 * 1. **`/collections`** garde le montage historique : `PageHeader` masqué sous
 *    `sm` (`hidden sm:block`) + un `h1` `sr-only sm:hidden` qui prend le relais
 *    pour les lecteurs d'écran (WCAG 2.4.6 / 1.3.1).
 * 2. **Le catalogue** (`/produits`, `/produits/[type]`) n'a plus de `PageHeader`
 *    du tout depuis la direction « L'étal continue » (2026-08-05) : son bloc
 *    titre est la première cellule de la grille, et son `h1` est **visible à
 *    tous les viewports**.
 *
 * ⚠️ Le montage 1 reposait sur une prémisse qui est TOMBÉE côté catalogue : la
 * bottom-bar était censée fournir le contexte visuel, mais l'onglet « Produits »
 * a été converti en bouton de recherche (audit recherche 2026-07-26). La page
 * n'affichait alors plus un seul mot en mobile — un `h1` masqué et rien d'autre.
 * C'est pour ça que le catalogue a changé de montage et pas `/collections`, qui
 * n'a jamais eu d'onglet dédié.
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
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

/**
 * Montage 1 — `PageHeader` masqué en mobile, repli `sr-only`.
 *
 * `/collections/[slug]` et `/creations/[slug]` n'y figurent pas : leur
 * `PageHeader` n'est pas masqué, il fournit le `h1` à tous les viewports.
 */
const SURFACES_WITH_HIDDEN_PAGE_HEADER = ["app/(shop)/collections/page.tsx"];

/** Montage 2 — bloc titre en cellule de grille, `h1` visible partout. */
const CATALOG_HEADING = "modules/products/components/catalog-heading.tsx";
const CATALOG_SHELL = "modules/products/components/product-catalog.tsx";

describe("catalogue — h1 en mobile (@regression catalogue-mobile-h1)", () => {
	describe("montage 1 — PageHeader masqué + repli sr-only", () => {
		it.each(SURFACES_WITH_HIDDEN_PAGE_HEADER)(
			"%s masque son PageHeader en mobile ET fournit un h1 sr-only",
			(path) => {
				const source = read(path);

				// Prémisse : le PageHeader est bien masqué sous `sm`. Si ce n'était plus le cas,
				// le repli deviendrait inutile et l'assertion suivante n'aurait plus de sens —
				// on veut alors un échec qui invite à relire, pas un test vacuously true.
				expect(source).toMatch(/className="hidden sm:block"/);

				// Le repli : un h1 exposé aux lecteurs d'écran, masqué visuellement, et retiré
				// dès que le PageHeader reprend la main (`sm:hidden`) pour ne pas doubler le h1.
				expect(source).toMatch(/<h1[^>]*className="sr-only sm:hidden"/);

				expect(source.match(/<h1\b/g)).toHaveLength(1);
			},
		);
	});

	describe("montage 2 — le catalogue porte un h1 VISIBLE partout", () => {
		it("le bloc titre déclare un h1, et il n'est pas masqué par un breakpoint", () => {
			const source = read(CATALOG_HEADING);
			const headings = source.match(/<h1[\s\S]*?>/g);

			expect(headings).toHaveLength(1);

			// Ni `sr-only`, ni `hidden` : c'est tout l'objet du changement de montage —
			// la page doit dire son nom sous 40rem, où elle n'affichait plus rien.
			expect(headings![0]).not.toMatch(/\bsr-only\b/);
			expect(headings![0]).not.toMatch(/\bhidden\b/);
		});

		it("le shell ne rend plus de PageHeader et ne déclare aucun h1 concurrent", () => {
			const source = read(CATALOG_SHELL);

			// Un `PageHeader` réintroduit ramènerait le doublon de h1 ET le second
			// `BreadcrumbList` (cf. @regression catalogue-single-breadcrumb).
			expect(source).not.toMatch(/<PageHeader\b/);
			expect(source.match(/<h1\b/g)).toBeNull();
		});

		it("le h2 masqué du bloc titre nomme la même liste que la grille", () => {
			// Deux libellés divergents pour un seul ensemble (« Liste des créations »
			// côté titre, « Liste des produits » côté grille) laissaient un lecteur
			// d'écran entendre deux noms pour la même chose.
			expect(read(CATALOG_HEADING)).toContain('<h2 className="sr-only">Liste des créations</h2>');
			expect(read("modules/products/components/product-list.tsx")).not.toContain(
				"Liste des produits",
			);
		});
	});
});
