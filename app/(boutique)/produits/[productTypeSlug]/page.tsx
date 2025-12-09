import type { ProductSearchParams } from "../page";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { notFound } from "next/navigation";
import { ProductListing } from "../_components/product-listing";
import { generateProductTypeMetadata } from "./_utils/generate-metadata";

type BijouxPageProps = {
	params: Promise<{ productTypeSlug: string }>;
	searchParams: Promise<ProductSearchParams>;
};

/**
 * Page /produits/[productTypeSlug]
 *
 * Affiche les produits d'un type spécifique avec:
 * - Navigation par onglets de types
 * - Filtres (couleur, prix, tri)
 * - Recherche
 * - Pagination
 */
export default async function BijouxPage({
	params,
	searchParams,
}: BijouxPageProps) {
	const { productTypeSlug } = await params;
	const searchParamsData = await searchParams;

	// Récupérer tous les types de bijoux actifs
	const productTypesData = await getProductTypes({
		perPage: 100,
		sortBy: "label-ascending",
		filters: {
			isActive: true,
		},
	});

	// Trouver le type correspondant au slug
	const productType = productTypesData.productTypes.find(
		(t) => t.slug === productTypeSlug
	);

	// 404 si le type n'existe pas
	if (!productType) {
		notFound();
	}

	return (
		<ProductListing
			searchParams={searchParamsData}
			productType={productType}
			productTypes={productTypesData.productTypes}
		/>
	);
}

// Export de la fonction generateMetadata depuis le fichier utilitaire
export { generateProductTypeMetadata as generateMetadata };
