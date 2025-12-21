import { CollectionStatus } from "@/app/generated/prisma/client";
import type { ProductFiltersSearchParams } from "@/app/(boutique)/produits/page";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { Toolbar } from "@/shared/components/toolbar";
import { getCollectionBySlug } from "@/modules/collections/data/get-collection";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	SORT_LABELS,
	SORT_OPTIONS,
} from "@/modules/products/data/get-products";
import { getProducts } from "@/modules/products/data/get-products";
import type { SortField } from "@/modules/products/data/get-products";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { parseFilters } from "../_utils/params";

/**
 * Collection page search params (base + filters, without collection filters)
 */
export type CollectionSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	filter_sortBy?: string;
} & Omit<ProductFiltersSearchParams, "collectionId" | "collectionSlug">;
import { generateCollectionMetadata } from "./_utils/generate-metadata";
import { generateCollectionStructuredData } from "./_utils/generate-structured-data";

type CollectionPageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<CollectionSearchParams>;
};

export default async function CollectionPage({
	params,
	searchParams,
}: CollectionPageProps) {
	// Note: Pas de "use cache" ici car la page utilise searchParams (filtres dynamiques)
	// Le cache est géré au niveau de getCollectionBySlug() et getProducts()

	const { slug } = await params;
	const searchParamsData = await searchParams;

	// Récupérer la collection
	const collection = await getCollectionBySlug({ slug });

	// Vérifier que la collection existe et est publiée
	if (!collection || collection.status !== CollectionStatus.PUBLIC) {
		notFound();
	}

	// Extraction du terme de recherche pour l'affichage
	const searchTerm =
		typeof searchParamsData.search === "string"
			? searchParamsData.search
			: undefined;

	// Helper pour extraire les paramètres
	const getFirstParam = (
		param: string | string[] | undefined
	): string | undefined => {
		if (Array.isArray(param)) return param[0];
		return param;
	};

	// Récupérer les produits avec filtres
	const cursor = getFirstParam(searchParamsData.cursor);
	const direction = (getFirstParam(searchParamsData.direction) || "forward") as
		| "forward"
		| "backward";
	const perPage =
		Number(getFirstParam(searchParamsData.perPage)) ||
		GET_PRODUCTS_DEFAULT_PER_PAGE;
	const sortByFromFilter = getFirstParam(searchParamsData.filter_sortBy);
	const sortByFromParam = getFirstParam(searchParamsData.sortBy);
	const sortBy = sortByFromFilter || sortByFromParam || "best-selling";

	// Créer une Promise pour les produits (comme products/page.tsx)
	const productsPromise = getProducts({
		cursor,
		direction,
		perPage,
		sortBy: sortBy as SortField,
		search: searchTerm,
		filters: parseFilters(searchParamsData, slug),
	});

	const breadcrumbs = [
		{ label: "Collections", href: "/collections" },
		{ label: collection.name, href: `/collections/${slug}` },
	];

	// Récupérer l'image du produit vedette pour le SEO
	const featuredProduct = collection.products.find((pc) => pc.isFeatured);
	const featuredImageUrl = featuredProduct?.product?.skus?.[0]?.images?.[0]?.url || null;

	// Générer les données structurées pour le SEO
	const structuredData = generateCollectionStructuredData({
		slug: collection.slug,
		name: collection.name,
		description: collection.description,
		featuredImageUrl,
	});

	return (
		<div className="min-h-screen">
			{/* Structured Data JSON-LD pour SEO */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
			/>

			<PageHeader
				title={searchTerm ? `Recherche "${searchTerm}"` : collection.name}
				description={collection.description ?? undefined}
				breadcrumbs={breadcrumbs}
			/>

			{/* Section principale avec catalogue */}
			<section className="bg-background pt-6 pb-12 lg:pt-8 lg:pb-16">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					<Toolbar
						search={
							<SearchInput mode="live" size="sm"
								paramName="search"
								placeholder={`Rechercher dans ${collection.name}...`}
								className="w-full"
							/>
						}
					>
						<SelectFilter
							filterKey="sortBy"
							label="Trier par"
							options={Object.values(SORT_OPTIONS).map((option) => ({
								value: option,
								label: SORT_LABELS[option as keyof typeof SORT_LABELS],
							}))}
							placeholder="Meilleures ventes"
						/>
					</Toolbar>

					<Suspense fallback={<ProductListSkeleton />}>
						<ProductList productsPromise={productsPromise} perPage={perPage} />
					</Suspense>
				</div>
			</section>
		</div>
	);
}

// Export de la fonction generateMetadata depuis le fichier utilitaire
export { generateCollectionMetadata as generateMetadata };
