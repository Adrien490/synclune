import { Suspense } from "react";
import dynamic from "next/dynamic";

import type {
	GetProductsReturn,
	ProductFilters,
	SortField,
} from "@/modules/products/data/get-products";
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
import { ProductFilterBar } from "@/modules/products/components/product-filter-bar";
import { ProductFilterRail } from "@/modules/products/components/product-filter-rail";

import { safeJsonLd } from "@/shared/utils/safe-json-ld";
import { BreadcrumbNav } from "@/shared/components/breadcrumb-nav";
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
	/**
	 * Tri actif, et filtres serveur **déjà fusionnés** (type du path compris).
	 *
	 * ⚠️ Ces deux props ne sont PAS décoratives : sans elles, `ProductList` ne
	 * peut pas les transmettre au load-more mobile, qui retombe alors sur
	 * `created-descending` + `{}`. Un curseur issu de la requête filtrée
	 * paginait donc une requête DIFFÉRENTE — sur `/produits` comme sur
	 * `/produits/[productTypeSlug]`, descendre sous une page filtrée y ajoutait
	 * des pièces hors filtre, et le compteur pouvait afficher « 29 sur 9 ».
	 * Elles pilotent aussi la `key` de remount de `ProductsLoadMore` : sans
	 * elles, changer de tri ou de filtre ne réinitialisait plus l'accumulation.
	 * Verrouillé par `catalog-loadmore-filter-parity.regression.test.tsx`.
	 */
	sortBy?: SortField;
	filters?: ProductFilters;
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
 * Le catalogue n'a pas de bande d'en-tête (« L'étal continue », 2026-08-05) mais
 * son bloc titre est l'**en-tête de page** (re-tranché le 2026-08-05) : fil
 * d'Ariane → titre → barre d'outils → [rail | grille]. Le titre n'est PLUS une
 * cellule de `CATALOG_GRID` — ce montage plaçait le `h1` après la barre de tri
 * et après le `h2` « Filtres » du rail, et lui faisait partager sa rangée avec
 * une carte à `lg`. Même montage que `/collections` et `/favoris`.
 *
 * ## Ce que la structure garantit
 *
 * - **La grille ne contient que la liste.** Le `Suspense` et le fragment de
 *   `ProductList` ne produisent aucun nœud DOM : les cartes (et les cellules
 *   pleine rangée de la liste) sont des enfants directs de `CATALOG_GRID`.
 * - **Un seul meuble par geste et par viewport.** La barre sticky
 *   (`ProductFilterBar`, « Filtrer » seul) est le meuble `< lg` ; à `lg` elle
 *   disparaît (`lg:hidden`), le rail couvrant filtres ET tri. Le tri vit dans
 *   le compartiment « Trier par » du corps de filtres partagé
 *   (`ProductFilterCompartments`) — rail desktop, panneau mobile. Il n'y a
 *   plus de recherche inline sur le catalogue (2026-08-06) : l'entrée de
 *   recherche est le quick-search navbar / bottom-nav, qui atterrit sur
 *   `/produits?search=` — le support serveur du paramètre reste.
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
	sortBy,
	filters,
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
	// `searchTerm` compte : depuis le retrait du champ inline (2026-08-06),
	// l'étiquette « Recherche : "x" » du bandeau est la seule affordance qui
	// efface `?search=` — le bandeau doit donc se monter pour elle aussi.
	const hasActiveFilters =
		activeFiltersCount > 0 || !!activeProductType || !!preferOnSale || !!searchTerm;

	const pageTitle = searchTerm
		? `Recherche "${searchTerm}"`
		: activeProductType
			? activeProductType.label
			: "Les créations";

	const sortOptions = Object.values(PRODUCTS_SORT_OPTIONS).map((option) => ({
		value: option,
		label: PRODUCTS_SORT_LABELS[option as keyof typeof PRODUCTS_SORT_LABELS],
	}));

	return (
		<div className="min-h-dvh">
			<ScrollRestoration />
			{/* JSON-LD Structured Data — SAFE: serialized via safeJsonLd (no user HTML) */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

			{/*
			 * `data-accent="rose"` : le catalogue déclare sa « salle » (audit /produits
			 * 2026-08-05, direction B) — les consommateurs de `--section-*` la trouvent
			 * déclarée au lieu de retomber en silence sur le fallback. Rose sur les DEUX
			 * pages catalogue : c'est la couleur que tout le vocabulaire de la surface
			 * dérive déjà (ruban des étiquettes, tape des cartes, souligné des titres) ;
			 * l'identité d'une famille reste sa touche unique et l'accent de sa barre.
			 */}
			<section
				data-accent="rose"
				className="bg-background relative z-10 pt-[calc(var(--navbar-height-static)+0.75rem)] pb-12 lg:pb-16"
			>
				<div
					id="product-container"
					className="group/container mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8"
				>
					{/*
					 * Fil d'Ariane VISUEL uniquement — pas de `BreadcrumbList` JSON-LD.
					 * Celui de la page est déjà émis par `buildCatalogJsonLd`, imbriqué
					 * dans son `CollectionPage` ; c'est le double émetteur (`PageHeader`
					 * + générateur de page) qui publiait deux `BreadcrumbList` par URL.
					 */}
					<BreadcrumbNav items={breadcrumbs} />

					{/*
					 * Le bloc titre est l'EN-TÊTE DE PAGE, hors de la grille et avant la
					 * barre (re-tranché le 2026-08-05) : l'ancien montage « L'étal
					 * continue » le rendait première cellule de `CATALOG_GRID`, donc le `h1`
					 * arrivait APRÈS la barre de tri et après le `h2` « Filtres » du rail,
					 * et partageait sa rangée avec une carte à `lg`. Le `h1` reste
					 * synchrone : seul le compte passe par la Suspense interne du bloc.
					 *
					 * La rangée ne porte plus que le titre (2026-08-06) : la recherche
					 * inline est retirée du catalogue (l'entrée de recherche est le
					 * quick-search navbar / bottom-nav) et le tri vit dans le meuble de
					 * filtres — compartiment « Trier par » du rail et du panneau.
					 */}
					<CatalogHeading
						title={pageTitle}
						productsPromise={productsPromise}
						activeProductType={activeProductType}
						searchTerm={searchTerm}
					/>

					{/* La barre sticky — le meuble `< lg`, réduit au seul « Filtrer »
					    (le panneau qu'il ouvre porte aussi le tri). */}
					<Suspense fallback={null}>
						<ProductFilterBar />
					</Suspense>

					{/*
					 * « Le plan de travail » (2026-08-05) : à partir de `lg`, le filtre
					 * n'est plus un overlay posé SUR le catalogue — il en devient la
					 * colonne gauche (16rem), et la grille passe à 3 colonnes. Le rail
					 * est rendu ICI, sous `group/container`, ce qui lui donne
					 * gratuitement le grisage `data-pending` cellule par cellule que le
					 * panneau portalisé ne pouvait pas atteindre.
					 */}
					<div className="lg:grid lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-8">
						<ProductFilterRail
							colors={colors}
							materials={materials}
							productTypes={productTypes.map((t) => ({
								slug: t.slug,
								label: t.label,
								_count: t._count,
							}))}
							sortOptions={sortOptions}
							maxPriceInEuros={maxPriceInEuros}
							activeProductTypeSlug={activeProductType?.slug}
							// Sème le pied « N pièces » du rail (« Le comptoir », audit rail
							// 2026-08-05, dir. D) avec le total que la grille affiche déjà —
							// même promesse, même règle que le panneau plus bas : consommée
							// par `use()` dans une frontière Suspense, jamais awaitée ici.
							resultCountPromise={productsPromise}
						/>

						<div className="min-w-0 space-y-5">
							{hasActiveFilters && (
								<ProductFilterBadges
									colors={colors}
									materials={materials}
									productTypes={productTypes}
									activeProductType={activeProductType}
									// Visible à TOUS les viewports (re-tranché par l'user le
									// 2026-08-06, en même temps que le retrait du résumé texte du
									// compteur) : les étiquettes sont la surface de MANIPULATION
									// des filtres actifs — chacune se supprime d'un geste, là où
									// le résumé ne faisait que les décrire. Le gate `lg:hidden`
									// de « Le comptoir » (2026-08-05) est annulé ; les libellés
									// « Tout effacer » rail/bandeau restent DISTINCTS exprès
									// (strict mode E2E).
								/>
							)}

							<div className={CATALOG_GRID}>
								<Suspense fallback={<ProductListSkeleton />}>
									<ProductList
										productsPromise={productsPromise}
										perPage={perPage}
										searchTerm={searchTerm}
										wishlistProductIdsPromise={wishlistProductIdsPromise}
										preferOnSale={preferOnSale}
										sortBy={sortBy}
										filters={filters}
									/>
								</Suspense>
							</div>
						</div>
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
					sortOptions={sortOptions}
					maxPriceInEuros={maxPriceInEuros}
					activeProductTypeSlug={activeProductType?.slug}
					// Sème le compteur vivant : le total des filtres COURANTS est déjà
					// calculé par cette promesse (la grille l'affiche), donc ouvrir le
					// panneau sans rien toucher n'a pas à le redemander au serveur.
					// La promesse est passée telle quelle — l'awaiter ici retarderait le
					// shell, le panneau la consomme par `use()` dans sa propre frontière.
					initialCountPromise={productsPromise}
				/>
			</Suspense>
		</div>
	);
}
