import type { ProductFiltersSearchParams } from "@/app/(shop)/produits/_utils/types";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { getStorefrontCollectionBySlug } from "@/modules/collections/data/get-collection";
import { getPublicCollectionSlugs } from "@/modules/collections/data/get-public-collection-slugs";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import type { SortField } from "@/modules/products/data/get-products";
import { GET_PRODUCTS_DEFAULT_PER_PAGE, getProducts } from "@/modules/products/data/get-products";
import { PageHeader } from "@/shared/components/page-header";
import { getFirstParam } from "@/shared/utils/params";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { parseFilters } from "../_utils/params";
import { generateCollectionMetadata } from "./_utils/generate-metadata";
import { generateCollectionStructuredData } from "./_utils/generate-structured-data";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";

/**
 * Collection page search params (pagination only, no search or sort filters)
 */
export type CollectionSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
} & Omit<ProductFiltersSearchParams, "collectionId" | "collectionSlug">;

// Pre-genere les chemins des collections publiques au build time.
// Si zero collection PUBLIC : retourne [] et laisse Next.js generer dynamiquement
// les pages a la premiere requete (cache "use cache" interne au fetcher).
export async function generateStaticParams() {
	const collections = await getPublicCollectionSlugs();
	return collections.map((c) => ({ slug: c.slug }));
}

type CollectionPageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<CollectionSearchParams>;
};

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
	// Note: Pas de "use cache" ici car la page utilise searchParams (filtres dynamiques)
	// Le cache est géré au niveau de getStorefrontCollectionBySlug() et getProducts()

	const [{ slug }, searchParamsData] = await Promise.all([params, searchParams]);

	// Récupérer la collection (select léger pour le storefront)
	const collection = await getStorefrontCollectionBySlug({ slug });

	// Vérifier que la collection existe et est publiée
	if (!collection || collection.status !== CollectionStatus.PUBLIC) {
		notFound();
	}

	// Fetch products with filters
	const cursor = getFirstParam(searchParamsData.cursor);
	const direction = (getFirstParam(searchParamsData.direction) ?? "forward") as
		| "forward"
		| "backward";
	const perPage = Number(getFirstParam(searchParamsData.perPage)) || GET_PRODUCTS_DEFAULT_PER_PAGE;
	const sortBy = getFirstParam(searchParamsData.sortBy) ?? "created-descending";

	// Créer les Promises pour les produits et la wishlist en parallèle
	const wishlistProductIdsPromise = getWishlistProductIds();
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
	const featuredImageUrl = featuredProduct?.product.skus[0]?.images[0]?.url ?? null;

	// Mapper les produits pour le mainEntity ItemList JSON-LD (Product+Offer enrichi).
	// Limite à 30 entries pour controler la taille de la balise script (Google indexe ~25 items).
	const structuredProducts = collection.products
		.filter((pc) => pc.product.skus[0])
		.slice(0, 30)
		.map((pc) => {
			const sku = pc.product.skus[0]!;
			const image = sku.images[0];
			return {
				slug: pc.product.slug,
				title: pc.product.title,
				priceInclTax: sku.priceInclTax,
				imageUrl: image?.url,
				imageAlt: image?.altText ?? undefined,
				inStock: sku.inventory > 0,
			};
		});

	// Générer les données structurées pour le SEO
	const structuredData = generateCollectionStructuredData({
		slug: collection.slug,
		name: collection.name,
		description: collection.description,
		featuredImageUrl,
		products: structuredProducts,
	});

	return (
		<div className="min-h-screen">
			{/* Structured Data JSON-LD pour SEO — SAFE: serialized via safeJsonLd */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: safeJsonLd(structuredData),
				}}
			/>

			<PageHeader
				title={collection.name}
				description={collection.description ?? undefined}
				breadcrumbs={breadcrumbs}
			/>

			{/* Section principale avec catalogue */}
			<section className="bg-background relative isolate overflow-hidden pt-6 pb-12 lg:pt-8 lg:pb-16">
				<div
					aria-hidden="true"
					className="bg-primary/15 pointer-events-none absolute -top-8 right-4 -z-10 size-48 rounded-full blur-3xl motion-safe:animate-pulse sm:right-12"
				/>
				<div
					aria-hidden="true"
					className="bg-secondary/25 pointer-events-none absolute top-40 left-4 -z-10 size-36 rounded-full blur-3xl [animation-delay:1.5s] motion-safe:animate-pulse sm:left-12"
				/>
				<div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
					<Suspense fallback={<ProductListSkeleton />}>
						<ProductList
							productsPromise={productsPromise}
							perPage={perPage}
							wishlistProductIdsPromise={wishlistProductIdsPromise}
						/>
					</Suspense>
				</div>
			</section>
		</div>
	);
}

// Export de la fonction generateMetadata depuis le fichier utilitaire
export { generateCollectionMetadata as generateMetadata };
