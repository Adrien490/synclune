import { Suspense, type ReactNode } from "react";
import dynamic from "next/dynamic";

import type { GetProductsReturn } from "@/modules/products/data/get-products";
import type { ProductType } from "@/modules/product-types/types/product-type.types";
import type { Color } from "@/modules/colors/types/color.types";
import type { MaterialOption } from "@/modules/materials/types/materials.types";
import type {
	ActiveProductType,
	CatalogBreadcrumb,
	CatalogListProps,
} from "@/modules/products/types/catalog-shell.types";

import {
	PRODUCTS_SORT_LABELS,
	PRODUCTS_SORT_OPTIONS,
} from "@/modules/products/constants/product.constants";

import {
	CatalogHeading,
	CatalogHeadingSkeleton,
} from "@/modules/products/components/catalog-heading";
import { CATALOG_GRID } from "@/modules/products/components/catalog-grid.constants";
import { ProductFilterBadges } from "@/modules/products/components/filter-badges";
import { ProductList } from "@/modules/products/components/product-list";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { ProductFilterBar } from "@/modules/products/components/product-filter-bar";
import { ProductFilterRail } from "@/modules/products/components/product-filter-rail";

import { BreadcrumbNav, BreadcrumbNavSkeleton } from "@/shared/components/breadcrumb-nav";
import { ScrollRestoration } from "@/shared/components/scroll-restoration";

const ProductFilterSheet = dynamic(() =>
	import("@/modules/products/components/product-filter-sheet").then(
		(mod) => mod.ProductFilterSheet,
	),
);

export type ProductCatalogProps = {
	/**
	 * Catalogue courant. ⚠️ Construite par la page **sans awaiter** ses
	 * `searchParams` (cf. `resolveCatalogProducts`) : c'est la condition pour que
	 * la page reste prérendable.
	 */
	productsPromise: Promise<GetProductsReturn>;
	/**
	 * Tout ce qui se déduit des `searchParams` — taille de page, terme recherché,
	 * tri et filtres serveur. Consommée dans un enfant SUSPENDU, jamais ici.
	 */
	listPropsPromise: Promise<CatalogListProps>;
	/** Fil d'Ariane visuel ; promesse sur la route catégorie (le libellé vient de la base). */
	breadcrumbsPromise: Promise<CatalogBreadcrumb[]>;
	/**
	 * Type filtré par le PATH. Absente sur `/produits` — c'est aussi ce qui dit
	 * au squelette du bloc titre quelle réservation faire (`mono` vs `rail`).
	 */
	activeProductTypePromise?: Promise<ActiveProductType>;
	/** Wishlist product IDs (pre-fetched at page level to avoid inline promise) */
	wishlistProductIdsPromise?: Promise<Set<string>>;
	/** Tous les types de produits disponibles */
	productTypes: ProductType[];
	/** Toutes les couleurs disponibles */
	colors: Color[];
	/** Tous les matériaux disponibles */
	materials: MaterialOption[];
	/** Prix maximum en euros */
	maxPriceInEuros: number;
	/**
	 * Balisage structuré de la page, rendu ICI derrière sa propre frontière
	 * `Suspense`.
	 *
	 * ⚠️ C'est un ReactNode et non un objet : l'`ItemList` a besoin des produits,
	 * donc le construire dans la page obligeait à y awaiter `productsPromise` —
	 * ce qui rendait la page entièrement dynamique et réduisait son App Shell au
	 * squelette pleine page de `loading.tsx`. L'émetteur (`CatalogJsonLd`) porte
	 * son propre `await` et streame. Un seul script par URL, cf. le commentaire
	 * de ce composant.
	 */
	jsonLdSlot: ReactNode;
};

/**
 * Le fil d'Ariane VISUEL du catalogue — zéro JSON-LD, jamais
 * (@regression catalogue-single-breadcrumb : le seul émetteur de
 * `BreadcrumbList` est `buildCatalogJsonLd`, imbriqué dans son `CollectionPage`).
 *
 * Enfant suspendu parce que sur `/produits/[productTypeSlug]` le second maillon
 * porte le libellé du type, donc un `await params` + une lecture en base.
 *
 * ⚠️ Exporté pour être TESTABLE : le renderer client de RTL ne sait pas monter
 * un Server Component `async`, et `use()` ne reprend pas sur une promesse nue
 * hors framework (vérifié). Les tests l'appellent donc comme une fonction.
 */
export async function CatalogBreadcrumbs({
	breadcrumbsPromise,
}: {
	breadcrumbsPromise: Promise<CatalogBreadcrumb[]>;
}) {
	return <BreadcrumbNav items={await breadcrumbsPromise} />;
}

/**
 * La grille — le seul endroit où le tri et les filtres serveur se matérialisent.
 *
 * ⚠️ `sortBy` et `filters` doivent atteindre `ProductList`, qui les transmet au
 * load-more mobile et en dérive sa `key` de remount. Sans eux, un curseur issu
 * de la requête filtrée paginait une requête DIFFÉRENTE
 * (@regression catalog-loadmore-filter-parity).
 *
 * Exporté pour la même raison que `CatalogBreadcrumbs` ci-dessus.
 */
export async function CatalogList({
	listPropsPromise,
	productsPromise,
	wishlistProductIdsPromise,
}: {
	listPropsPromise: Promise<CatalogListProps>;
	productsPromise: Promise<GetProductsReturn>;
	wishlistProductIdsPromise?: Promise<Set<string>>;
}) {
	const { perPage, searchTerm, sortBy, filters, preferOnSale } = await listPropsPromise;

	return (
		<ProductList
			productsPromise={productsPromise}
			perPage={perPage}
			searchTerm={searchTerm}
			wishlistProductIdsPromise={wishlistProductIdsPromise}
			preferOnSale={preferOnSale}
			sortBy={sortBy}
			filters={filters}
		/>
	);
}

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
 * - **Rien n'est awaité au niveau supérieur.** Ce composant ne reçoit que des
 *   données `"use cache"` (types, couleurs, matières, prix max) et des
 *   PROMESSES. Tout ce qui dérive de l'URL (`searchParams`, `params`) est résolu
 *   dans un enfant suspendu. C'est ce qui met le meuble de filtres dans l'**App
 *   Shell** de la route : à la navigation, le rail, la barre et le panneau se
 *   peignent immédiatement, avec la coche déjà appliquée — seule la grille
 *   attend. Avant (2026-08-07), les deux pages awaitaient leurs `searchParams`,
 *   donc l'App Shell se réduisait au squelette PLEINE PAGE de `loading.tsx` :
 *   cocher un type donnait l'impression que la page se rechargeait.
 *   ⚠️ Ne pas réintroduire de prop déjà résolue qui viendrait d'un
 *   `await searchParams` / `await params` : c'est exactement ce qui refermerait
 *   la coquille.
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
 * - **Le `h1` est visible partout**, et ne dépend d'aucune lecture en base : sur
 *   `/produits` il est même dans la coquille. Sur la route catégorie il attend
 *   `params` — une résolution sans I/O — et jamais le catalogue.
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
	listPropsPromise,
	breadcrumbsPromise,
	activeProductTypePromise,
	wishlistProductIdsPromise,
	productTypes,
	colors,
	materials,
	maxPriceInEuros,
	jsonLdSlot,
}: ProductCatalogProps) {
	const sortOptions = Object.values(PRODUCTS_SORT_OPTIONS).map((option) => ({
		value: option,
		label: PRODUCTS_SORT_LABELS[option as keyof typeof PRODUCTS_SORT_LABELS],
	}));

	return (
		<div className="min-h-dvh">
			<ScrollRestoration />
			{/*
			 * Le balisage structuré STREAME : son `ItemList` attend le catalogue, et
			 * rien d'autre sur cette page ne doit attendre avec lui. `fallback={null}`
			 * — un script n'a pas d'état de chargement.
			 */}
			<Suspense fallback={null}>{jsonLdSlot}</Suspense>

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
					<Suspense fallback={<BreadcrumbNavSkeleton />}>
						<CatalogBreadcrumbs breadcrumbsPromise={breadcrumbsPromise} />
					</Suspense>

					{/*
					 * Le bloc titre est l'EN-TÊTE DE PAGE, hors de la grille et avant la
					 * barre (re-tranché le 2026-08-05) : l'ancien montage « L'étal
					 * continue » le rendait première cellule de `CATALOG_GRID`, donc le `h1`
					 * arrivait APRÈS la barre de tri et après le `h2` « Filtres » du rail,
					 * et partageait sa rangée avec une carte à `lg`.
					 *
					 * La rangée ne porte plus que le titre (2026-08-06) : la recherche
					 * inline est retirée du catalogue (l'entrée de recherche est le
					 * quick-search navbar / bottom-nav) et le tri vit dans le meuble de
					 * filtres — compartiment « Trier par » du rail et du panneau.
					 *
					 * Le titre dépend du terme recherché et du type du path, donc de
					 * l'URL : d'où la frontière. Le compte de pièces, lui, garde la sienne
					 * À L'INTÉRIEUR du bloc — le `h1` n'attend jamais le catalogue.
					 */}
					<Suspense
						fallback={
							<CatalogHeadingSkeleton accent={activeProductTypePromise ? "mono" : "rail"} />
						}
					>
						<CatalogHeading
							listPropsPromise={listPropsPromise}
							productsPromise={productsPromise}
							activeProductTypePromise={activeProductTypePromise}
						/>
					</Suspense>

					{/* La barre sticky — le meuble `< lg`, réduit au seul « Filtrer »
					    (le panneau qu'il ouvre porte aussi le tri).
					    Pas de `<Suspense>` ici : `ProductFilterBar` porte DÉJÀ la sienne,
					    avec le même `fallback={null}` (elle est obligatoire, le composant
					    lit `useSearchParams()`). La doubler n'ajoutait qu'un palier. */}
					<ProductFilterBar />

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
							// Sème le pied « N pièces » du rail (« Le comptoir », audit rail
							// 2026-08-05, dir. D) avec le total que la grille affiche déjà —
							// même promesse, même règle que le panneau plus bas : consommée
							// par `use()` dans une frontière Suspense, jamais awaitée ici.
							resultCountPromise={productsPromise}
						/>

						<div className="min-w-0 space-y-5">
							<ProductFilterBadges
								colors={colors}
								materials={materials}
								productTypes={productTypes}
								// Visible à TOUS les viewports (re-tranché par l'user le
								// 2026-08-06, en même temps que le retrait du résumé texte du
								// compteur) : les étiquettes sont la surface de MANIPULATION
								// des filtres actifs — chacune se supprime d'un geste, là où
								// le résumé ne faisait que les décrire. Le gate `lg:hidden`
								// de « Le comptoir » (2026-08-05) est annulé ; les libellés
								// « Tout effacer » rail/bandeau restent DISTINCTS exprès
								// (strict mode E2E).
								//
								// Plus de gate `hasActiveFilters` ici : il se déduisait des
								// `searchParams` AWAITÉS, ce qui aurait retenu le bandeau
								// hors de la coquille. Le composant se rend `null` de
								// lui-même quand aucun filtre n'est actif — c'est déjà le
								// comportement de `FilterBadges`.
							/>

							<div className={CATALOG_GRID}>
								<Suspense fallback={<ProductListSkeleton />}>
									<CatalogList
										listPropsPromise={listPropsPromise}
										productsPromise={productsPromise}
										wishlistProductIdsPromise={wishlistProductIdsPromise}
									/>
								</Suspense>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Pas de `<Suspense>` ici non plus : `ProductFilterSheet` porte déjà la
			    sienne, `fallback={null}` identique. */}
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
				// Sème le compteur vivant : le total des filtres COURANTS est déjà
				// calculé par cette promesse (la grille l'affiche), donc ouvrir le
				// panneau sans rien toucher n'a pas à le redemander au serveur.
				// La promesse est passée telle quelle — l'awaiter ici retarderait le
				// shell, le panneau la consomme par `use()` dans sa propre frontière.
				initialCountPromise={productsPromise}
			/>
		</div>
	);
}
