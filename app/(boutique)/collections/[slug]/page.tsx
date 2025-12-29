import type { ProductFiltersSearchParams } from "@/app/(boutique)/produits/page";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { getCollectionBySlug } from "@/modules/collections/data/get-collection";
import { getPublicCollectionSlugs } from "@/modules/collections/data/get-public-collection-slugs";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import type { SortField } from "@/modules/products/data/get-products";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	getProducts,
} from "@/modules/products/data/get-products";
import { PageHeader } from "@/shared/components/page-header";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { parseFilters } from "../_utils/params";
import { generateCollectionMetadata } from "./_utils/generate-metadata";
import { generateCollectionStructuredData } from "./_utils/generate-structured-data";

/**
 * Collection page search params (pagination only, no search or sort filters)
 */
export type CollectionSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
} & Omit<ProductFiltersSearchParams, "collectionId" | "collectionSlug">;

// Pre-genere les chemins des collections publiques au build time
export async function generateStaticParams() {
	const collections = await getPublicCollectionSlugs();
	return collections.map((c) => ({ slug: c.slug }));
}

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
	const sortBy = getFirstParam(searchParamsData.sortBy) || "best-selling";

	// Créer une Promise pour les produits (comme products/page.tsx)
	const productsPromise = getProducts({
		cursor,
		direction,
		perPage,
		sortBy: sortBy as SortField,
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
				title={collection.name}
				description={collection.description ?? undefined}
				breadcrumbs={breadcrumbs}
			/>

			{/* Section principale avec catalogue */}
			<section className="bg-background pt-6 pb-12 lg:pt-8 lg:pb-16">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
