/**
 * @regression admin-mobile-no-duplicate-back
 *
 * **Règle projet : pas de double bouton retour en admin mobile.**
 *
 * `AdminMobileHeader` affiche un chevron « Retour » + l'eyebrow du parent sur
 * toutes les routes de `DETAIL_ROUTE_PATTERNS`. C'est désormais la SEULE
 * affordance de retour (`SwipeBackProvider` a été retiré du dépôt), donc tout
 * lien/bouton « Retour » supplémentaire dans le corps d'une page de détail est un
 * doublon.
 *
 * L'audit en avait trouvé trois :
 *  - `product-detail-header.tsx` : lien `md:hidden` « ← Produits » (trois
 *    affordances empilées avec le chevron et l'eyebrow) ;
 *  - `create-refund-form.tsx` : bouton « Retour » même pas borné en breakpoint ;
 *  - `variants-product-context.tsx` : carte annoncée « Retour à la fiche produit ».
 *
 * Les ~10 autres ressources admin n'en avaient aucun — c'est la norme à tenir.
 *
 * Ce test est STATIQUE (lecture de source) : un rendu par route couvrirait mal
 * les 30+ vues de détail, et le défaut est textuel par nature.
 *
 * Toute modification requiert une review explicite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../../../../..");

/**
 * Surfaces rendues DANS le corps d'une page de détail admin mobile.
 * Y ajouter un fichier est légitime ; y laisser un « Retour » ne l'est pas.
 */
const DETAIL_BODY_SURFACES = [
	"modules/products/components/admin/product-detail/product-detail-header.tsx",
	"modules/orders/components/admin/order-detail/order-header.tsx",
	"modules/refunds/components/admin/refund-detail-header.tsx",
	"modules/skus/components/admin/sku-detail/sku-detail-header.tsx",
	"modules/collections/components/admin/collection-detail/collection-detail-header.tsx",
	"modules/materials/components/admin/material-detail/material-detail-header.tsx",
	"modules/colors/components/admin/color-detail/color-detail-header.tsx",
	"modules/product-types/components/admin/product-type-detail/product-type-detail-header.tsx",
	"app/admin/(protected)/catalogue/produits/[slug]/variantes/_components/variants-product-context.tsx",
] as const;

/** Retire commentaires de ligne et de bloc — un exemple en commentaire n'est pas un doublon. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

describe("@regression admin-mobile-no-duplicate-back", () => {
	it.each(DETAIL_BODY_SURFACES)("%s n'affiche aucune affordance « Retour »", (relPath) => {
		const code = stripComments(readFileSync(join(ROOT, relPath), "utf8"));

		// Libellé visible ou accessible commençant par « Retour »
		expect(code).not.toMatch(/["'>]\s*Retour\b/);
		expect(code).not.toMatch(/aria-label=[{"'`]?[^"'`}]*\bRetour\b/);
	});

	it("aucune surface de détail n'importe ArrowLeftIcon (icône de retour)", () => {
		const offenders = DETAIL_BODY_SURFACES.filter((relPath) => {
			const code = stripComments(readFileSync(join(ROOT, relPath), "utf8"));
			return /^import\s+\{[^}]*\bArrowLeftIcon\b[^}]*\}\s+from\s+["']@phosphor-icons\/react\/ssr["']/m.test(
				code,
			);
		});

		expect(offenders).toEqual([]);
	});

	it("le chevron « Retour » du header mobile existe toujours (seule affordance restante)", () => {
		const header = stripComments(
			readFileSync(join(ROOT, "app/admin/(protected)/_components/admin-mobile-header.tsx"), "utf8"),
		);

		expect(header).toMatch(/aria-label="Retour"/);
		expect(header).toMatch(/CaretLeftIcon/);
	});

	it("le header mobile n'émet pas de <h1> (la page porte la structure)", () => {
		const header = stripComments(
			readFileSync(join(ROOT, "app/admin/(protected)/_components/admin-mobile-header.tsx"), "utf8"),
		);

		expect(header).not.toMatch(/<h1[\s>]/);
	});
});
