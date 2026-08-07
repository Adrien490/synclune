import { accentForSlug } from "@/modules/products/components/catalog-accents.constants";
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
 * le bloc titre. Consommé par la barre (`ProductFilterBar`).
 */
export function shelfAccentForPathname(pathname: string): ShelfBarAccent {
	return SHELF_ACCENT_BY_RAIL[
		isProductCategoryPage(pathname)
			? accentForSlug(decodeURIComponent(pathname.split("/")[2] ?? ""))
			: "bg-primary"
	];
}
