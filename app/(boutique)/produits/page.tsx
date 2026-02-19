import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ProductCatalog } from "@/modules/products/components/product-catalog";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";

import type { ProductSearchParams } from "./_utils/types";
import { parseFilters } from "./_utils/params";
import {
	getCatalogData,
	parsePaginationParams,
	fetchProducts,
	countActiveFilters,
	buildCatalogJsonLd,
} from "./_utils/catalog";

// ============================================================================
// METADATA
// ============================================================================

const DEFAULT_METADATA = {
	title: "Tous mes bijoux colorés faits main | Synclune - Nantes",
	description:
		"Découvrez tous mes bijoux colorés créés à la main dans mon atelier nantais. Inspirations Pokémon, Van Gogh, Twilight... Chaque pièce est unique !",
	keywords:
		"bijoux artisanaux, bijoux faits main, bijoutier Nantes, bagues colliers bracelets, acier inoxydable, perles, bijoux colorés, bijoux pokemon, bijoux van gogh",
};

type BijouxPageProps = {
	searchParams: Promise<ProductSearchParams>;
};

export async function generateMetadata({
	searchParams,
}: BijouxPageProps): Promise<Metadata> {
	const searchParamsData = await searchParams;

	// Si seul le type est présent, rediriger vers la page catégorie dédiée
	const typeParam = searchParamsData.type;
	if (typeParam && !Array.isArray(typeParam)) {
		// Vérifier qu'il n'y a pas d'autres filtres actifs
		const otherFilters = Object.keys(searchParamsData).filter(
			(key) =>
				!["cursor", "direction", "perPage", "sortBy", "search", "type"].includes(key)
		);
		if (otherFilters.length === 0) {
			// La redirection sera gérée dans le composant page
			return {};
		}
	}

	// Vérifier si des filtres sont actifs
	const hasActiveFilters = Object.keys(searchParamsData).some(
		(key) =>
			!["cursor", "direction", "perPage", "sortBy", "search"].includes(key)
	);

	return {
		title: DEFAULT_METADATA.title,
		description: DEFAULT_METADATA.description,
		keywords: DEFAULT_METADATA.keywords,
		alternates: {
			canonical: "/produits",
		},
		robots: hasActiveFilters ? { index: false, follow: true } : undefined,
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
}

// ============================================================================
// PAGE
// ============================================================================

export default async function BijouxPage({ searchParams }: BijouxPageProps) {
	const searchParamsData = await searchParams;

	// Redirection SEO: /produits?type=X → /produits/X
	const typeParam = searchParamsData.type;
	if (typeParam && !Array.isArray(typeParam)) {
		// Vérifier qu'il n'y a pas d'autres filtres actifs (sauf pagination/tri)
		const otherFilters = Object.keys(searchParamsData).filter(
			(key) =>
				!["cursor", "direction", "perPage", "sortBy", "search", "type"].includes(key)
		);
		if (otherFilters.length === 0) {
			// Construire l'URL de redirection avec les params de pagination/recherche
			const redirectParams = new URLSearchParams();
			if (searchParamsData.search) redirectParams.set("search", searchParamsData.search);
			if (searchParamsData.sortBy) redirectParams.set("sortBy", searchParamsData.sortBy);
			if (searchParamsData.cursor) redirectParams.set("cursor", searchParamsData.cursor);
			if (searchParamsData.direction) redirectParams.set("direction", searchParamsData.direction);

			const queryString = redirectParams.toString();
			redirect(`/produits/${typeParam}${queryString ? `?${queryString}` : ""}`);
		}
	}

	// Récupérer les données du catalogue
	const { productTypes, colors, materials, maxPriceInEuros } =
		await getCatalogData();

	// Parser les paramètres
	const { perPage, searchTerm } = parsePaginationParams(searchParamsData);
	const filters = parseFilters(searchParamsData);

	// Récupérer les produits et la wishlist en parallèle
	const productsPromise = fetchProducts(searchParamsData);
	const wishlistProductIdsPromise = getWishlistProductIds();

	// Compter les filtres actifs
	const activeFiltersCount = countActiveFilters(searchParamsData, filters);

	// Breadcrumbs
	const breadcrumbs = [{ label: "Créations", href: "/produits" }];

	// JSON-LD
	const jsonLd = buildCatalogJsonLd({
		name: "Bijoux artisanaux faits main",
		description:
			"Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes.",
		url: "https://synclune.fr/produits",
		breadcrumbs: [
			{ name: "Accueil", url: "https://synclune.fr" },
			{ name: "Bijoux" },
		],
	});

	return (
		<ProductCatalog
			productsPromise={productsPromise}
			perPage={perPage}
			searchTerm={searchTerm}
			wishlistProductIdsPromise={wishlistProductIdsPromise}
			productTypes={productTypes}
			colors={colors}
			materials={materials}
			maxPriceInEuros={maxPriceInEuros}
			activeFiltersCount={activeFiltersCount}
			jsonLd={jsonLd}
			breadcrumbs={breadcrumbs}
		/>
	);
}
