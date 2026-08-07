import type { Metadata } from "next";

import { ProductCatalog } from "@/modules/products/components/product-catalog";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";

import { SITE_URL } from "@/shared/constants/seo-config";
import type { ProductSearchParams } from "./_utils/types";
import { getCatalogData, resolveCatalogListProps, resolveCatalogProducts } from "./_utils/catalog";
import { CatalogJsonLd } from "./_components/catalog-json-ld";

// ============================================================================
// METADATA
// ============================================================================

const DEFAULT_METADATA = {
	title: "Tous mes bijoux colorés faits main | Synclune",
	description:
		"Découvrez tous mes bijoux colorés créés à la main dans mon atelier. Inspirations Pokémon, Van Gogh, Twilight... Chaque pièce est unique !",
	keywords:
		"bijoux artisanaux, bijoux faits main, créatrice bijoux, bagues colliers bracelets, acier inoxydable, perles, bijoux colorés, bijoux pokemon, bijoux van gogh",
};

type BijouxPageProps = {
	searchParams: Promise<ProductSearchParams>;
};

export async function generateMetadata({ searchParams }: BijouxPageProps): Promise<Metadata> {
	const searchParamsData = await searchParams;

	// Plus de branche « seul le type est présent » ici : la consolidation
	// `?type=X` → 308 `/produits/X` est faite par `proxy.ts`, donc cette page
	// n'est jamais rendue dans ce cas. La branche renvoyait `{}`, ce qui faisait
	// hériter les métadonnées racine — sans conséquence puisque la page
	// redirigeait, mais rien ne le garantissait.

	// Vérifier si des filtres sont actifs
	const hasActiveFilters = Object.keys(searchParamsData).some(
		(key) => !["cursor", "direction", "perPage", "sortBy", "search"].includes(key),
	);
	// P2-2 : pages cursor (`?cursor=...`) = duplicate content vs canonical
	// `/produits` → noindex pour préserver le crawl budget Google. Le `follow`
	// reste actif (PageRank diffuse via les liens pagination rel=prev/next).
	const isPaginated = !!searchParamsData.cursor;
	// `?search=` : même traitement que les filtres (audit recherche 2026-08-01,
	// P3-7). La page était indexable MAIS canonicalisée vers `/produits` nue —
	// signaux contradictoires ; les pages de résultats de recherche interne sont
	// par ailleurs explicitement déconseillées à l'indexation par Google. Le
	// JSON-LD `SearchAction` (sitelinks searchbox) n'exige pas l'indexation des
	// pages de résultats.
	const hasSearch = !!searchParamsData.search;
	const shouldNoindex = hasActiveFilters || isPaginated || hasSearch;

	return {
		title: DEFAULT_METADATA.title,
		description: DEFAULT_METADATA.description,
		keywords: DEFAULT_METADATA.keywords,
		alternates: {
			canonical: "/produits",
		},
		robots: shouldNoindex ? { index: false, follow: true } : undefined,
		openGraph: {
			title: "Tous mes bijoux colorés | Synclune",
			description:
				"Bijoux artisanaux faits main. Inspirations Pokémon, Van Gogh, Twilight... Pièces uniques créées avec passion !",
			url: `${SITE_URL}/produits`,
			type: "website",
			images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image",
			title: "Tous mes bijoux colorés | Synclune",
			description:
				"Bijoux artisanaux faits main. Inspirations Pokémon, Van Gogh, Twilight... Pièces uniques !",
		},
	};
}

// ============================================================================
// PAGE
// ============================================================================

/**
 * Fil d'Ariane et libellés JSON-LD : STATIQUES sur cette route, donc
 * `Promise.resolve` — le shell les attend comme ceux de la page catégorie, mais
 * ils se résolvent en un microtask et entrent dans l'App Shell.
 */
const breadcrumbsPromise = Promise.resolve([{ label: "Créations", href: "/produits" }]);

const jsonLdOptionsPromise = Promise.resolve({
	name: "Bijoux artisanaux faits main",
	description: "Découvrez toutes mes créations colorées faites main dans mon atelier.",
	url: `${SITE_URL}/produits`,
	breadcrumbs: [{ name: "Accueil", url: SITE_URL }, { name: "Bijoux" }],
});

/**
 * ⚠️ **Cette page n'awaite RIEN qui dépende de l'URL.**
 *
 * `await searchParams` ici rendait la page entièrement dynamique : sous
 * `cacheComponents`, son App Shell se réduisait alors au squelette PLEINE PAGE
 * de `loading.tsx`. Comme le filtre « type » change de path (`/produits` ↔
 * `/produits/[slug]`), cocher une famille affichait ce squelette — d'où
 * l'impression de rechargement. Les lectures d'URL passent par les résolveurs de
 * `_utils/catalog.ts`, appelés SANS `await` ; seul `getCatalogData()` est
 * attendu, et c'est du `"use cache"` (donc prérendable).
 *
 * La redirection SEO `?type=X` → 308 `/produits/X` vit désormais dans
 * `proxy.ts`, pour la même raison.
 */
export default async function BijouxPage({ searchParams }: BijouxPageProps) {
	const { productTypes, colors, materials, maxPriceInEuros } = await getCatalogData();

	const productsPromise = resolveCatalogProducts(searchParams);

	return (
		<ProductCatalog
			productsPromise={productsPromise}
			listPropsPromise={resolveCatalogListProps(searchParams)}
			breadcrumbsPromise={breadcrumbsPromise}
			wishlistProductIdsPromise={getWishlistProductIds()}
			productTypes={productTypes}
			colors={colors}
			materials={materials}
			maxPriceInEuros={maxPriceInEuros}
			jsonLdSlot={
				<CatalogJsonLd productsPromise={productsPromise} optionsPromise={jsonLdOptionsPromise} />
			}
		/>
	);
}
