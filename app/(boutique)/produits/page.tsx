import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getFirstParam } from "@/shared/utils/params";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProductListing } from "./_components/product-listing";

/**
 * Product filters search params (URL parameters)
 */
export type ProductFiltersSearchParams = {
	priceMin?: string;
	priceMax?: string;
	inStock?: string;
	type?: string | string[];
	material?: string | string[];
	collectionId?: string;
	collectionSlug?: string;
};

/**
 * Complete product search params (base + filters)
 */
export type ProductSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	filter_sortBy?: string;
} & ProductFiltersSearchParams;

export const metadata: Metadata = {
	title: "Tous mes bijoux colorés faits main | Synclune - Nantes",
	description:
		"Découvrez tous mes bijoux colorés créés à la main dans mon atelier nantais. Inspirations Pokémon, Van Gogh, Twilight... Chaque pièce est unique !",
	keywords:
		"bijoux artisanaux, bijoux faits main, bijoutier Nantes, bagues colliers bracelets, acier inoxydable, perles, bijoux colorés, bijoux pokemon, bijoux van gogh",
	alternates: {
		canonical: "/produits",
	},
	openGraph: {
		title: "Tous mes bijoux colorés | Synclune",
		description:
			"Bijoux artisanaux faits main à Nantes. Inspirations Pokémon, Van Gogh, Twilight... Pièces uniques créées avec passion !",
		url: "https://synclune.fr/produits",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Tous mes bijoux colorés | Synclune",
		description:
			"Bijoux artisanaux faits main à Nantes. Inspirations Pokémon, Van Gogh, Twilight... Pièces uniques !",
	},
};

type BijouxHubPageProps = {
	searchParams: Promise<ProductSearchParams>;
};

/**
 * Page hub /produits
 *
 * Affiche tous les produits avec:
 * - Navigation par onglets de types
 * - Filtres (couleur, prix, tri)
 * - Recherche
 * - Pagination
 */
export default async function BijouxHubPage({
	searchParams,
}: BijouxHubPageProps) {
	const searchParamsData = await searchParams;

	// SEO: Si un type est passé en search param, rediriger vers la page dédiée
	// Exemple: /produits?type=bagues → /produits/bagues
	const typeParam = getFirstParam(searchParamsData.type);
	if (typeParam) {
		redirect(`/produits/${typeParam}`);
	}

	// Récupérer tous les types de bijoux actifs
	const productTypesData = await getProductTypes({
		perPage: 50,
		sortBy: "label-ascending",
		filters: {
			isActive: true,
		},
	});

	return (
		<ProductListing
			searchParams={searchParamsData}
			productTypes={productTypesData.productTypes}
		/>
	);
}
