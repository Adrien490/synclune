import Link from "next/link";
import { SearchX } from "lucide-react";

import { getProducts } from "@/modules/products/data/get-products";
import { getProductTypes } from "@/modules/product-types/data/get-product-types";
import { ProductCard } from "@/modules/products/components/product-card";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
	EmptyContent,
} from "@/shared/components/ui/empty";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { NoResultsFilters } from "./no-results-filters";

interface NoResultsRecoveryProps {
	/** Terme de recherche actuel (pour l'echo) */
	searchTerm?: string;
	/** Suggestion de correction orthographique */
	suggestion?: string;
	/** URL de base pour le reset des filtres */
	baseResetUrl?: string;
}

/**
 * Composant Server de recuperation pour les pages sans resultats (Baymard UX)
 *
 * Fetch ses propres donnees:
 * - Produits populaires (4 best-sellers)
 * - Types de produits pour navigation
 *
 * @see https://baymard.com/blog/no-results-page
 */
export async function NoResultsRecovery({
	searchTerm,
	suggestion,
	baseResetUrl = "/produits",
}: NoResultsRecoveryProps) {
	// Fetch en parallele les produits populaires et les categories
	const [popularResult, productTypesResult] = await Promise.all([
		getProducts({
			perPage: 4,
			sortBy: "popular",
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
	]);

	const popularProducts = popularResult.products;
	const productTypes = productTypesResult.productTypes;

	return (
		<div className="space-y-8 mt-4 mb-12 sm:my-12">
			{/* Section principale avec message et actions */}
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<SearchX className="size-6" />
					</EmptyMedia>
					<EmptyTitle>
						{searchTerm
							? `Aucun resultat pour "${searchTerm}"`
							: "Aucun produit ne correspond a vos criteres"}
					</EmptyTitle>
					<EmptyDescription>
						{suggestion ? (
							<SuggestionLink suggestion={suggestion} />
						) : (
							"Essayez de modifier vos filtres ou explorez nos creations populaires ci-dessous."
						)}
					</EmptyDescription>
				</EmptyHeader>

				<EmptyContent className="space-y-4">
					{/* Filtres actifs avec suppression individuelle (Client Component) */}
					<NoResultsFilters />

					{/* Bouton reset */}
					<Button asChild variant="primary">
						<Link href={baseResetUrl}>Effacer les filtres</Link>
					</Button>
				</EmptyContent>
			</Empty>

			{/* Produits populaires */}
			{popularProducts.length > 0 && (
				<section aria-labelledby="popular-products-heading" className="space-y-4">
					<h2
						id="popular-products-heading"
						className="text-lg font-semibold text-center"
					>
						Nos creations populaires
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
						{popularProducts.map((product, index) => (
							<ProductCard
								key={product.id}
								product={product}
								index={index}
								isInWishlist={false}
							/>
						))}
					</div>
				</section>
			)}

			{/* Navigation par categorie */}
			{productTypes.length > 0 && (
				<section aria-labelledby="categories-heading" className="space-y-4">
					<h2
						id="categories-heading"
						className="text-lg font-semibold text-center"
					>
						Explorer par categorie
					</h2>
					<div className="flex flex-wrap justify-center gap-2">
						{productTypes.map((type) => (
							<Button
								key={type.slug}
								asChild
								variant="outline"
								size="sm"
								className="rounded-full"
							>
								<Link href={`/produits/${type.slug}`}>{type.label}</Link>
							</Button>
						))}
					</div>
				</section>
			)}
		</div>
	);
}

/**
 * Lien de suggestion de correction (Server Component)
 */
function SuggestionLink({ suggestion }: { suggestion: string }) {
	return (
		<span>
			Vouliez-vous dire :{" "}
			<Link
				href={`/produits?search=${encodeURIComponent(suggestion)}`}
				className="font-medium underline underline-offset-4"
			>
				{suggestion}
			</Link>{" "}
			?
		</span>
	);
}

/**
 * Skeleton pour le streaming Suspense
 */
export function NoResultsRecoverySkeleton() {
	return (
		<div className="space-y-8 mt-4 mb-12 sm:my-12">
			{/* Header skeleton */}
			<div className="flex flex-col items-center gap-4 text-center">
				<Skeleton className="size-12 rounded-full" />
				<Skeleton className="h-6 w-64" />
				<Skeleton className="h-4 w-80" />
				<Skeleton className="h-10 w-40 mt-2" />
			</div>

			{/* Popular products skeleton */}
			<div className="space-y-4">
				<Skeleton className="h-6 w-48 mx-auto" />
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="space-y-3">
							<Skeleton className="aspect-square rounded-lg" />
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-4 w-1/2" />
						</div>
					))}
				</div>
			</div>

			{/* Categories skeleton */}
			<div className="space-y-4">
				<Skeleton className="h-6 w-40 mx-auto" />
				<div className="flex flex-wrap justify-center gap-2">
					{[...Array(6)].map((_, i) => (
						<Skeleton key={i} className="h-8 w-20 rounded-full" />
					))}
				</div>
			</div>
		</div>
	);
}
