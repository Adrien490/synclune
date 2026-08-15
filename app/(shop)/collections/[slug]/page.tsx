import type { ProductFiltersSearchParams } from "@/app/(shop)/produits/_utils/types";
import { getStorefrontCollectionBySlug } from "@/modules/collections/data/get-collection";
import { accentForSlug } from "@/modules/products/components/catalog-accents.constants";
import { CATALOG_GRID } from "@/modules/products/components/catalog-grid.constants";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import type { GetProductsReturn, SortField } from "@/modules/products/data/get-products";
import { GET_PRODUCTS_DEFAULT_PER_PAGE, getProducts } from "@/modules/products/data/get-products";
import { BreadcrumbNav } from "@/shared/components/breadcrumb-nav";
import { StorefrontHeading } from "@/shared/components/storefront-heading";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { BRAND } from "@/shared/constants/brand";
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

// Pas de `generateStaticParams` : Cache Components REFUSE un tableau vide
// (`EmptyGenerateStaticParamsError` fait echouer le BUILD ENTIER, pas la seule
// route), ce qui rendait tout deploiement impossible tant qu'aucune collection
// n'etait publiee. Les chemins sont donc rendus a la demande — le cache reste
// assure par le "use cache" interne a getStorefrontCollectionBySlug() et
// getProducts().

type CollectionPageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<CollectionSearchParams>;
};

/** Compte streamé de la collection — seule cette ligne attend la promesse, jamais le `h1`. */
async function CollectionCount({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const { totalCount } = await productsPromise;

	if (totalCount === 0) return null;

	const noun = totalCount > 1 ? "pièces" : "pièce";

	return (
		<>
			<span className="text-foreground font-semibold tabular-nums">{totalCount}</span> {noun} dans
			cette collection.
		</>
	);
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
	// Note: Pas de "use cache" ici car la page utilise searchParams (filtres dynamiques)
	// Le cache est géré au niveau de getStorefrontCollectionBySlug() et getProducts()

	const [{ slug }, searchParamsData] = await Promise.all([params, searchParams]);

	// Récupérer la collection (select léger pour le storefront)
	const collection = await getStorefrontCollectionBySlug({ slug });

	// Vérifier que la collection existe et est publiée
	if (!collection || !collection.active) {
		notFound();
	}

	// Fetch products with filters
	const cursor = getFirstParam(searchParamsData.cursor);
	const direction = (getFirstParam(searchParamsData.direction) ?? "forward") as
		"forward" | "backward";
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

	// Image représentative pour le SEO — premier produit avec image (produits
	// actifs les plus récents en tête de liste)
	const featuredImageUrl =
		collection.products.find((product) => product.media[0]?.url)?.media[0]?.url ?? null;

	// Mapper les produits pour le mainEntity ItemList JSON-LD (Product+Offer enrichi).
	// Limite à 30 entries pour controler la taille de la balise script (Google indexe ~25 items).
	const structuredProducts = collection.products
		.filter((product) => product.variants[0])
		.slice(0, 30)
		.map((product) => {
			const variant = product.variants[0]!;
			const image = product.media[0];
			return {
				slug: product.slug,
				name: product.name,
				priceCents: variant.priceCents ?? product.priceCents,
				imageUrl: image?.url,
				imageAlt: image?.alt ?? undefined,
				inStock: variant.stock > 0,
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
		<div className="min-h-dvh">
			{/* Structured Data JSON-LD pour SEO — SAFE: serialized via safeJsonLd */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: safeJsonLd(structuredData),
				}}
			/>

			{/* Shell sans bande d'en-tête — même montage que /produits : fil d'Ariane
			    → bloc titre en tête de page → grille (le titre n'est PLUS une cellule
			    de la grille, re-tranché le 2026-08-05). Le `BreadcrumbList` de la page
			    est déjà dans le @graph de `generateCollectionStructuredData` injecté
			    ci-dessus ; `BreadcrumbNav` est visuel pur. */}
			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height-static)+0.75rem)] pb-12 lg:pt-[calc(var(--navbar-height-static)+1.25rem)] lg:pb-16">
				<div className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
					<BreadcrumbNav items={breadcrumbs} />

					<StorefrontHeading
						title={collection.name}
						// La couleur de la collection : un seul segment, dérivé du slug.
						accent={accentForSlug(collection.slug)}
						// Chapô masqué sous `sm` par le `<p>` hôte (lot 0, audit 2026-08-05) —
						// la description de collection (base) suit le même régime que le
						// repli : c'est le budget vertical mobile qui coupe, uniformément.
						description={
							collection.description ??
							`Les pièces de cette collection, faites une par une dans mon atelier à ${BRAND.contact.location.city}.`
						}
						descriptionClassName="hidden sm:block"
						countSlot={
							<Suspense
								fallback={
									<Skeleton as="span" className="inline-block h-4 w-44 rounded align-[-2px]" />
								}
							>
								<CollectionCount productsPromise={productsPromise} />
							</Suspense>
						}
						// Les cartes portent des h3 : ce libellé comble le saut de niveau
						// (WCAG 1.3.1, audit `heading-order`).
						listLabel={`Produits de la collection ${collection.name}`}
					/>

					{/*
					 * ⚠️ `CATALOG_GRID` est OBLIGATOIRE ici. `ProductList` ne rend AUCUN
					 * conteneur : ses cellules sont des enfants directs de la grille de
					 * l'hôte. Cette page était restée sur un simple `<div>` — ses cartes
					 * s'empilaient donc en blocs pleine largeur, une par ligne, pendant
					 * que le bloc « voir plus » (qui portait sa propre grille) était la
					 * seule zone correctement disposée de la page.
					 */}
					<div className={CATALOG_GRID}>
						<Suspense fallback={<ProductListSkeleton />}>
							<ProductList
								productsPromise={productsPromise}
								perPage={perPage}
								wishlistProductIdsPromise={wishlistProductIdsPromise}
								sortBy={sortBy as SortField}
								filters={parseFilters(searchParamsData, slug)}
							/>
						</Suspense>
					</div>
				</div>
			</section>
		</div>
	);
}

// Export de la fonction generateMetadata depuis le fichier utilitaire
export { generateCollectionMetadata as generateMetadata };
