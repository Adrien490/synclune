/**
 * @regression catalogue-mobile-h1
 *
 * Chaque surface catalogue doit exposer un `h1` en mobile.
 *
 * Le motif du dépôt : `PageHeader` est masqué en dessous de `sm` (`hidden sm:block`) parce
 * que la bottom-bar fournit déjà le contexte visuel, et un `h1` `sr-only sm:hidden` prend
 * le relais pour les lecteurs d'écran (WCAG 2.4.6 / 1.3.1). `product-catalog.tsx` le
 * faisait ; **`/collections` avait été oubliée** : en dessous de 40rem la page n'avait
 * aucun `h1`, et la première en-tête du document était le `h2` d'une carte de collection.
 *
 * Test statique sur les sources plutôt que rendu : ces pages sont des Server Components
 * qui résolvent `searchParams` et des promesses de données ; les monter demanderait de
 * simuler tout ça pour vérifier une seule balise. Le couple « PageHeader masqué en mobile
 * + repli sr-only » se lit directement.
 *
 * ⚠️ En E2E, ne PAS asserter ce `h1` avec `toBeVisible()` : `.sr-only` reste « visible »
 * pour Playwright (il est positionné hors écran, pas masqué). Utiliser
 * `getByRole("heading", { level: 1 })`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

/**
 * Surfaces dont le `PageHeader` est masqué en mobile et qui doivent donc porter un repli.
 * `/collections/[slug]` et `/creations/[slug]` n'y figurent pas : leur `PageHeader` n'est
 * pas masqué (pas de `hidden sm:block`), il fournit le `h1` à tous les viewports.
 */
const SURFACES_WITH_HIDDEN_PAGE_HEADER = [
	"modules/products/components/product-catalog.tsx",
	"app/(shop)/collections/page.tsx",
];

describe("catalogue — h1 en mobile (@regression catalogue-mobile-h1)", () => {
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
		},
	);

	it("les deux surfaces déclarent un seul h1 chacune", () => {
		for (const path of SURFACES_WITH_HIDDEN_PAGE_HEADER) {
			expect(read(path).match(/<h1\b/g)).toHaveLength(1);
		}
	});
});
