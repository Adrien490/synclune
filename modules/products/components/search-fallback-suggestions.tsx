import Link from "next/link";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { getProducts } from "@/modules/products/data/get-products";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { ProductCard } from "@/modules/products/components/product-card";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyActions,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
} from "@/shared/components/ui/empty";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ProductCardSkeleton } from "./product-card-skeleton";
import { ResetSearchFiltersAction } from "./reset-search-filters-action";
import { SearchCorrectionSuggestion } from "./search-correction-suggestion";

interface SearchFallbackSuggestionsProps {
	/** Terme de recherche actuel (pour l'echo) */
	searchTerm?: string;
	/** Suggestion de correction orthographique */
	suggestion?: string;
}

/**
 * Composant Server affichant des suggestions de repli pour les pages sans resultats (Baymard UX)
 *
 * Fetch ses propres donnees:
 * - Dernieres creations (4 produits les plus recents)
 * - Types de produits pour navigation
 *
 * @see https://baymard.com/blog/no-results-page
 */
export async function SearchFallbackSuggestions({
	searchTerm,
	suggestion,
}: SearchFallbackSuggestionsProps) {
	// Fetch en parallele les dernieres creations, categories et wishlist
	const [latestResult, productTypesResult, wishlistProductIds] = await Promise.all([
		getProducts({
			perPage: 4,
			sortBy: "created-descending",
			filters: {
				status: "PUBLIC",
				stockStatus: "in_stock",
			},
		}),
		getProductTypes({
			perPage: 20,
			sortBy: "label-ascending",
			filters: {
				isActive: true,
				hasProducts: true,
			},
		}),
		getWishlistProductIds(),
	]);

	const latestProducts = latestResult.products;
	const productTypes = productTypesResult.productTypes;

	return (
		<div className="mt-4 mb-12 space-y-8 sm:my-12">
			{/* Section principale avec message et actions */}
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<MagnifyingGlassIcon className="size-6" />
					</EmptyMedia>
					{/* Tutoiement : c'est Léane qui parle, et c'est le moment où la
					    cliente a le plus besoin d'être prise par la main. Le vouvoiement
					    d'origine (« vos critères », « vos filtres ») était la seule
					    entorse à la règle de voix sur cette surface.
					    ⚠️ Le mot « produit » est un CONTRAT E2E : `product-browsing.spec.ts`
					    cherche `/aucun produit/i` et `e2e/pages/search.page.ts`
					    `/aucun (résultat|produit)/i` pour reconnaître l'état vide. La voix
					    change, le mot-clé reste. */}
					<EmptyTitle>
						{searchTerm
							? `Aucun résultat pour « ${searchTerm} »`
							: "Aucun produit ne correspond à ta recherche"}
					</EmptyTitle>
					<EmptyDescription>
						{suggestion ? (
							// `SearchCorrectionSuggestion` et non un lien local : il clone les
							// `searchParams` courants au lieu de reconstruire l'URL de zéro, donc
							// accepter une correction ne fait plus perdre les filtres actifs.
							// `announce={false}` : le `<Empty>` parent est déjà une live region.
							<SearchCorrectionSuggestion suggestion={suggestion} announce={false} />
						) : (
							"Essaie un autre mot, ou retire un filtre — je n'ai qu'une poignée de pièces en ligne."
						)}
					</EmptyDescription>
				</EmptyHeader>
				{/*
				 * L'état vide n'était pas un cul-de-sac visuel mais un cul-de-sac
				 * fonctionnel : il conseillait de modifier ses filtres sans offrir aucun
				 * moyen de le faire. Le composant se masque de lui-même quand il n'y a ni
				 * filtre ni recherche à effacer (catalogue réellement vide).
				 */}
				<EmptyActions>
					<ResetSearchFiltersAction />
				</EmptyActions>
			</Empty>

			{/* Dernières créations */}
			{latestProducts.length > 0 && (
				<section aria-labelledby="latest-products-heading" className="space-y-4">
					{/* « Mes », pas « Nos » : il n'y a qu'une personne derrière la boutique. */}
					<h2 id="latest-products-heading" className="text-center text-lg font-semibold">
						Mes dernières créations
					</h2>
					{/* `lg:gap-8` comme la grille principale (`product-list.tsx`) : sans lui,
					    la gouttière changeait au moment où la recherche ne rend plus rien. */}
					<div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
						{latestProducts.map((product, index) => (
							<ProductCard
								key={product.id}
								product={product}
								index={index}
								isInWishlist={wishlistProductIds.has(product.id)}
								sectionId="search-fallback"
								disablePreload
							/>
						))}
					</div>
				</section>
			)}

			{/* Navigation par categorie */}
			{productTypes.length > 0 && (
				<section aria-labelledby="categories-heading" className="space-y-4">
					<h2 id="categories-heading" className="text-center text-lg font-semibold">
						Explorer par catégorie
					</h2>
					<div className="flex flex-wrap justify-center gap-2">
						{productTypes.map((type) => (
							<Button
								key={type.slug}
								render={<Link href={`/produits/${type.slug}`} />}
								variant="outline"
								size="sm"
								className="rounded-full"
							>
								{type.label}
							</Button>
						))}
					</div>
				</section>
			)}
		</div>
	);
}

/**
 * Skeleton pour le streaming Suspense
 */
export function SearchFallbackSuggestionsSkeleton() {
	return (
		<div className="mt-4 mb-12 space-y-8 sm:my-12">
			{/* Header skeleton */}
			<div className="flex flex-col items-center gap-4 text-center">
				<Skeleton className="size-12 rounded-full" />
				<Skeleton className="h-6 w-64" />
				<Skeleton className="h-4 w-80" />
				<Skeleton className="mt-2 h-10 w-40" />
			</div>

			{/* Popular products skeleton */}
			<div className="space-y-4">
				<Skeleton className="mx-auto h-6 w-48" />
				<div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
					{/* SSOT ProductCardSkeleton — l'ancien skeleton inline gardait le
					    ratio 3/4 mobile d'avant l'unification 4/5 (CLS au swap) */}
					{Array.from({ length: 4 }).map((_, i) => (
						<ProductCardSkeleton key={i} />
					))}
				</div>
			</div>

			{/* Categories skeleton */}
			<div className="space-y-4">
				<Skeleton className="mx-auto h-6 w-40" />
				<div className="flex flex-wrap justify-center gap-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-8 w-20 rounded-full" />
					))}
				</div>
			</div>
		</div>
	);
}
