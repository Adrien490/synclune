import { accentForSlug } from "@/modules/products/components/catalog-accents.constants";
import { PRODUCTS_SORT_LABELS } from "@/modules/products/constants/product.constants";
import { isProductCategoryPage } from "@/modules/products/services/product-filter-params.service";
import type { ShelfBarAccent } from "@/shared/components/shelf-bar/shelf-bar";

/**
 * Pont entre la SSOT des accents du catalogue (`accentForSlug`, qui parle en
 * classes d'aplat `bg-*` pour le rail du bloc titre) et le vocabulaire
 * sémantique de la coque partagée `ShelfBar` (rose/lavender/mint/sun).
 */
const SHELF_ACCENT_BY_RAIL: Record<ReturnType<typeof accentForSlug>, ShelfBarAccent> = {
	"bg-primary": "rose",
	"bg-brand-lavender": "lavender",
	"bg-brand-mint": "mint",
	"bg-brand-sun": "sun",
};

/**
 * L'accent de la page catalogue courante — le slug donne la teinte, comme sur
 * le bloc titre. Partagé entre la barre (`ProductSortBar`) et le cluster de la
 * rangée titre (`CatalogToolbarInline`) : les deux « Trier » doivent peindre le
 * même ruban, sinon la teinte change selon le viewport qui l'affiche.
 */
export function shelfAccentForPathname(pathname: string): ShelfBarAccent {
	return SHELF_ACCENT_BY_RAIL[
		isProductCategoryPage(pathname)
			? accentForSlug(decodeURIComponent(pathname.split("/")[2] ?? ""))
			: "bg-primary"
	];
}

/**
 * WCAG 2.5.3 Label in Name : le nom accessible d'un déclencheur « Trier »
 * commence par le libellé visible. Un `sortBy` forgé (URL) n'a pas de libellé —
 * le nom reste alors « Trier — tri actif », sans préciser. Sans tri actif,
 * `undefined` : pas d'aria-label, le libellé visible EST le nom.
 *
 * Partagé entre les deux déclencheurs (tiroir < lg, menu ancré ≥ lg) pour
 * qu'une commande vocale « clique Trier » matche aux deux viewports.
 */
export function sortTriggerLabelFor(sortByValue: string | null): string | undefined {
	if (!sortByValue) return undefined;
	const activeSortLabel = (PRODUCTS_SORT_LABELS as Partial<Record<string, string>>)[sortByValue];
	return `Trier — tri actif${activeSortLabel ? ` : ${activeSortLabel}` : ""}`;
}
