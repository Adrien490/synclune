import type { Metadata } from "next";

import { getProductTypeBySlug } from "@/modules/product-types/data/get-product-type";
import { ProductCatalog } from "@/modules/products/components/product-catalog";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";

import { SITE_URL } from "@/shared/constants/seo-config";
import type { ActiveProductType } from "@/modules/products/types/catalog-shell.types";
import type { ProductSearchParams } from "../_utils/types";
import {
	getCatalogData,
	resolveActiveProductType,
	resolveCatalogListProps,
	resolveCatalogProducts,
	resolveCategoryBreadcrumbs,
} from "../_utils/catalog";
import { CatalogJsonLd, type CatalogJsonLdOptions } from "../_components/catalog-json-ld";

// ============================================================================
// STATIC GENERATION — volontairement absente
// ============================================================================

// Pas de `generateStaticParams` : Cache Components refuse un tableau vide
// (`EmptyGenerateStaticParamsError` fait échouer le build entier), donc aucun
// déploiement n'était possible sans type de produit actif portant des bijoux.
// Les pages catégorie sont rendues à la demande.

// ============================================================================
// TYPES
// ============================================================================

type ProductTypeCategoryPageProps = {
	params: Promise<{ productTypeSlug: string }>;
	searchParams: Promise<ProductSearchParams>;
};

// ============================================================================
// METADATA
// ============================================================================

export async function generateMetadata({
	params,
	searchParams,
}: ProductTypeCategoryPageProps): Promise<Metadata> {
	const [{ productTypeSlug }, searchParamsData] = await Promise.all([params, searchParams]);

	// Récupérer le type de produit
	const productType = await getProductTypeBySlug({ slug: productTypeSlug });

	if (!productType) {
		// `{}` faisait hériter les métadonnées racine (donc indexables) sur une page qui
		// va appeler `notFound()`. Alignement sur les branches « non trouvé » produit et
		// collection, qui posent toutes deux ce `robots`.
		return {
			title: "Catégorie non trouvée - Synclune",
			description: "Cette catégorie de bijoux n'existe pas ou n'est plus disponible.",
			robots: { index: false, follow: false },
		};
	}

	// Vérifier si des filtres additionnels sont actifs (hors type)
	const hasAdditionalFilters = Object.keys(searchParamsData).some(
		(key) => !["cursor", "direction", "perPage", "sortBy", "search"].includes(key),
	);
	// P2-2 : pages cursor noindex (duplicate content vs canonical catégorie)
	const isPaginated = !!searchParamsData.cursor;
	// Catégorie sans aucun produit visible = thin content → noindex (la page
	// reste navigable avec son état vide, mais ne doit pas être indexée)
	const isEmpty = productType._count.products === 0;
	const shouldNoindex = hasAdditionalFilters || isPaginated || isEmpty;

	const title = `${productType.label} artisanaux faits main | Synclune`;
	const description =
		productType.description ??
		`Découvrez mes ${productType.label.toLowerCase()} colorés créés à la main dans mon atelier. Pièces uniques et originales !`;

	return {
		title,
		description,
		keywords: `${productType.label.toLowerCase()}, bijoux artisanaux, bijoux faits main, créatrice bijoux, ${productType.label.toLowerCase()} colorés`,
		alternates: {
			canonical: `/produits/${productTypeSlug}`,
		},
		// Indexer la page catégorie, noindex si filtres additionnels ou pagination
		robots: shouldNoindex ? { index: false, follow: true } : undefined,
		openGraph: {
			title: `${productType.label} | Synclune`,
			description,
			url: `${SITE_URL}/produits/${productTypeSlug}`,
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: `${productType.label} | Synclune`,
			description,
		},
	};
}

// ============================================================================
// PAGE
// ============================================================================

/** Libellés du `CollectionPage` — ils portent le nom de la famille, donc `params`. */
async function resolveJsonLdOptions(
	activeProductTypePromise: Promise<ActiveProductType>,
): Promise<CatalogJsonLdOptions> {
	const { slug, label, description } = await activeProductTypePromise;

	return {
		name: `${label} artisanaux faits main`,
		description: description ?? `Découvrez mes ${label.toLowerCase()} colorés créés à la main.`,
		url: `${SITE_URL}/produits/${slug}`,
		breadcrumbs: [
			{ name: "Accueil", url: SITE_URL },
			{ name: "Créations", url: `${SITE_URL}/produits` },
			{ name: label },
		],
	};
}

/**
 * ⚠️ **Cette page n'awaite ni `params` ni `searchParams`** — cf. le commentaire
 * jumeau de `../page.tsx`. C'est la condition pour que le meuble de filtres
 * entre dans l'App Shell de la route, au lieu que la navigation depuis
 * `/produits` affiche le squelette pleine page de `loading.tsx`.
 *
 * Les deux lectures d'URL sont poussées dans des enfants suspendus par les
 * résolveurs de `../_utils/catalog.ts`, tous appelés SANS `await`.
 * `resolveActiveProductType` porte aussi le `notFound()` du slug inconnu.
 */
export default async function ProductTypeCategoryPage({
	params,
	searchParams,
}: ProductTypeCategoryPageProps) {
	const { productTypes, colors, materials, maxPriceInEuros } = await getCatalogData();

	const activeProductTypePromise = resolveActiveProductType(params);
	// Le type vient du PATH : les résolveurs le fusionnent aux filtres. Le
	// load-more reçoit la version FUSIONNÉE, sinon « voir plus » sur une page
	// catégorie ramènerait tout le catalogue.
	const productsPromise = resolveCatalogProducts(searchParams, params);

	return (
		<ProductCatalog
			productsPromise={productsPromise}
			listPropsPromise={resolveCatalogListProps(searchParams, params)}
			breadcrumbsPromise={resolveCategoryBreadcrumbs(activeProductTypePromise)}
			activeProductTypePromise={activeProductTypePromise}
			wishlistProductIdsPromise={getWishlistProductIds()}
			productTypes={productTypes}
			colors={colors}
			materials={materials}
			maxPriceInEuros={maxPriceInEuros}
			jsonLdSlot={
				<CatalogJsonLd
					productsPromise={productsPromise}
					optionsPromise={resolveJsonLdOptions(activeProductTypePromise)}
				/>
			}
		/>
	);
}
