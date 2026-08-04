import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import type { GetProductsReturn } from "@/modules/products/data/get-products";
import type { ProductType } from "@/modules/product-types/types/product-type.types";
import type { Color } from "@/modules/colors/types/color.types";
import type { MaterialOption } from "@/modules/materials/types/materials.types";

import {
	PRODUCTS_SORT_LABELS,
	PRODUCTS_SORT_OPTIONS,
} from "@/modules/products/constants/product.constants";

import { CatalogHeading } from "@/modules/products/components/catalog-heading";
import { CATALOG_GRID } from "@/modules/products/components/catalog-grid.constants";
import { ProductFilterBadges } from "@/modules/products/components/filter-badges";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { ProductSortBar } from "@/modules/products/components/product-sort-bar";

import { safeJsonLd } from "@/shared/utils/safe-json-ld";
import { ScrollRestoration } from "@/shared/components/scroll-restoration";

const ProductFilterSheet = dynamic(() =>
	import("@/modules/products/components/product-filter-sheet").then(
		(mod) => mod.ProductFilterSheet,
	),
);

export type ProductCatalogProps = {
	/** Promise des produits (permet le streaming) */
	productsPromise: Promise<GetProductsReturn>;
	/** Nombre de produits par page */
	perPage: number;
	/** Terme de recherche actif */
	searchTerm?: string;
	/** Wishlist product IDs (pre-fetched at page level to avoid inline promise) */
	wishlistProductIdsPromise?: Promise<Set<string>>;
	/** Type de produit filtré (pour la page catégorie) */
	activeProductType?: {
		slug: string;
		label: string;
		description?: string | null;
	};
	/** Tous les types de produits disponibles */
	productTypes: ProductType[];
	/** Toutes les couleurs disponibles */
	colors: Color[];
	/** Tous les matériaux disponibles */
	materials: MaterialOption[];
	/** Prix maximum en euros */
	maxPriceInEuros: number;
	/** Nombre de filtres actifs */
	activeFiltersCount: number;
	/** Si true, le filtre "En promotion" est actif */
	preferOnSale?: boolean;
	/** JSON-LD structured data */
	jsonLd: object;
	/** Breadcrumbs */
	breadcrumbs: Array<{ label: string; href: string }>;
};

/**
 * Shell des deux pages catalogue — `/produits` et `/produits/[productTypeSlug]`.
 *
 * @description
 * Direction « L'étal continue » (artifact du 2026-08-05, reco B). Le catalogue
 * n'a plus de bande d'en-tête : son bloc titre est la **première cellule de la
 * grille des créations**, exactement comme sur la page d'accueil. On ne franchit
 * pas une frontière entre la boutique et son catalogue — on continue de
 * descendre le même étal.
 *
 * ## Ce que la structure garantit
 *
 * - **Une seule grille.** Le `Suspense` et le fragment de `ProductList` ne
 *   produisent aucun nœud DOM : les cartes sont des enfants directs de la même
 *   grille que le bloc titre. C'est tout le concept — sans ça, on retombe sur
 *   une bande + une grille.
 * - **Une seule barre.** `ProductSortBar` sert les deux breakpoints ; l'ancienne
 *   `Toolbar` en carte blanche (et son `SelectFilter` dont le libellé bégayait
 *   « Trier par  Trier par ») a disparu.
 * - **Le `h1` est visible partout**, et ne dépend d'aucun `await` : seul le
 *   compte de pièces est derrière une frontière `Suspense`.
 * - **Aucune longueur dérivée de `--navbar-height`**, qui se contracte au
 *   défilement : la barre colle sous `--navbar-height-static`.
 *
 * ⚠️ **`id="product-container"` et `group/container` ne se renomment pas.** Le
 * premier est la cible de défilement du panneau de filtres
 * (`PRODUCTS_GRID_ANCHOR_ID`) — son absence dégrade en `window.scrollTo(0)`
 * silencieux ; le second est le seul ancêtre du `group-has-[[data-pending]]`
 * qui grise les cartes pendant une recherche. Aucun test ne les protège.
 */
export function ProductCatalog({
	productsPromise,
	perPage,
	searchTerm,
	wishlistProductIdsPromise,
	activeProductType,
	productTypes,
	colors,
	materials,
	maxPriceInEuros,
	activeFiltersCount,
	preferOnSale,
	jsonLd,
	breadcrumbs,
}: ProductCatalogProps) {
	const hasActiveFilters = activeFiltersCount > 0 || !!activeProductType || !!preferOnSale;

	const pageTitle = searchTerm
		? `Recherche "${searchTerm}"`
		: activeProductType
			? activeProductType.label
			: "Les créations";

	const sortOptions = Object.values(PRODUCTS_SORT_OPTIONS).map((option) => ({
		value: option,
		label: PRODUCTS_SORT_LABELS[option as keyof typeof PRODUCTS_SORT_LABELS],
	}));

	const searchPlaceholder = activeProductType
		? `Rechercher des ${activeProductType.label.toLowerCase()}…`
		: "Rechercher des bijoux…";

	return (
		<div className="min-h-dvh">
			<ScrollRestoration />
			{/* JSON-LD Structured Data — SAFE: serialized via safeJsonLd (no user HTML) */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height-static)+0.75rem)] pb-12 lg:pt-[calc(var(--navbar-height-static)+1.25rem)] lg:pb-16">
				<div
					id="product-container"
					className="group/container mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8"
				>
					{/*
					 * Fil d'Ariane VISUEL uniquement — pas de `BreadcrumbList` JSON-LD.
					 * Celui de la page est déjà émis par `buildCatalogJsonLd`, imbriqué
					 * dans son `CollectionPage` ; c'est le double émetteur (`PageHeader`
					 * + générateur de page) qui publiait deux `BreadcrumbList` par URL.
					 * Masqué sous `md` : la barre y occupe déjà toute la ligne, et le
					 * bloc titre juste en dessous dit où l'on est.
					 */}
					<nav
						aria-label="Fil d'Ariane"
						className="text-muted-foreground hidden text-sm leading-normal md:block"
					>
						<ol className="m-0 flex list-none items-center gap-2 p-0">
							<li>
								<Link href="/" className="focus-ring rounded-sm hover:underline">
									Accueil
								</Link>
							</li>
							{breadcrumbs.map((crumb, index) => {
								const isLast = index === breadcrumbs.length - 1;
								return (
									<li key={crumb.href} className="flex items-center gap-2">
										<span aria-hidden="true">/</span>
										{isLast ? (
											<span className="text-foreground font-medium" aria-current="page">
												{crumb.label}
											</span>
										) : (
											<Link href={crumb.href} className="focus-ring rounded-sm hover:underline">
												{crumb.label}
											</Link>
										)}
									</li>
								);
							})}
						</ol>
					</nav>

					<Suspense fallback={null}>
						<ProductSortBar sortOptions={sortOptions} searchPlaceholder={searchPlaceholder} />
					</Suspense>

					{hasActiveFilters && (
						<ProductFilterBadges
							colors={colors}
							materials={materials}
							productTypes={productTypes}
							activeProductType={activeProductType}
						/>
					)}

					<div className={CATALOG_GRID}>
						<CatalogHeading
							title={pageTitle}
							productsPromise={productsPromise}
							activeProductType={activeProductType}
							searchTerm={searchTerm}
						/>

						<Suspense fallback={<ProductListSkeleton />}>
							<ProductList
								productsPromise={productsPromise}
								perPage={perPage}
								searchTerm={searchTerm}
								wishlistProductIdsPromise={wishlistProductIdsPromise}
								preferOnSale={preferOnSale}
							/>
						</Suspense>
					</div>
				</div>
			</section>

			<Suspense fallback={null}>
				<ProductFilterSheet
					colors={colors}
					materials={materials}
					productTypes={productTypes.map((t) => ({
						slug: t.slug,
						label: t.label,
						_count: t._count,
					}))}
					maxPriceInEuros={maxPriceInEuros}
					activeProductTypeSlug={activeProductType?.slug}
				/>
			</Suspense>
		</div>
	);
}
