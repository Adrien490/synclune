import { ProductCatalogSkeleton } from "@/modules/products/components/product-catalog-skeleton";

export default function ProductTypeCategoryLoading() {
	// `accent="mono"` : la page de type rend une touche unique (`accentForSlug`)
	// dont ce fichier ne connaît pas la couleur — réservation neutre.
	return <ProductCatalogSkeleton accent="mono" />;
}
