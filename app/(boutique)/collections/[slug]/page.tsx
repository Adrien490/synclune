import type { ProductFiltersSearchParams } from "@/app/(boutique)/produits/_utils/types";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { getStorefrontCollectionBySlug } from "@/modules/collections/data/get-collection";
import { getPublicCollectionSlugs } from "@/modules/collections/data/get-public-collection-slugs";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import type { SortField } from "@/modules/products/data/get-products";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	getProducts,
} from "@/modules/products/data/get-products";
import { PageHeader } from "@/shared/components/page-header";
import { getFirstParam } from "@/shared/utils/params";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
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
// Next.js 16 avec Cache Components requiert au moins un résultat
export async function generateStaticParams() {
	const collections = await getPublicCollectionSlugs();
	if (collections.length === 0) {
		// Fallback pour satisfaire Next.js 16 - sera géré par notFound() au runtime
		return [{ slug: "__placeholder__" }];
	}
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
	// Le cache est géré au niveau de getStorefrontCollectionBySlug() et getProducts()

	const { slug } = await params;
	const searchParamsData = await searchParams;

	// Récupérer la collection (select léger pour le storefront)
	const collection = await getStorefrontCollectionBySlug({ slug });

	// Vérifier que la collection existe et est publiée
	if (!collection || collection.status !== CollectionStatus.PUBLIC) {
		notFound();
	}

	// Fetch products with filters
	const cursor = getFirstParam(searchParamsData.cursor);
	const direction = (getFirstParam(searchParamsData.direction) || "forward") as
		| "forward"
		| "backward";
	const perPage =
		Number(getFirstParam(searchParamsData.perPage)) ||
		GET_PRODUCTS_DEFAULT_PER_PAGE;
	const sortBy = getFirstParam(searchParamsData.sortBy) || "created-descending";

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

	// Extract hero images for shared element transition destination
	const heroImages = collection.products
		.map((pc) => pc.product?.skus?.[0]?.images?.[0])
		.filter((img): img is NonNullable<typeof img> => Boolean(img?.url))
		.slice(0, 4);

	return (
		<div className="min-h-screen">
			{/* Structured Data JSON-LD pour SEO */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
			/>

			<PageHeader
				title={collection.name}
				description={collection.description ?? undefined}
				breadcrumbs={breadcrumbs}
			/>

			{/* Collection hero strip — shared element transition destination from collection card */}
			{heroImages.length > 0 && (
				<ViewTransition name={`collection-${slug}`} share="vt-collection-image">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6" aria-hidden="true">
						<div className="grid grid-cols-4 gap-0.5 rounded-xl overflow-hidden h-16 sm:h-20 lg:h-24">
							{heroImages.map((img, i) => (
								<div key={img.url} className="relative overflow-hidden bg-muted">
									<Image
										src={img.url}
										alt={img.altText || ""}
										fill
										className="object-cover"
										sizes="(max-width: 640px) 25vw, 15vw"
										loading={i === 0 ? "eager" : "lazy"}
									/>
								</div>
							))}
						</div>
					</div>
				</ViewTransition>
			)}

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
