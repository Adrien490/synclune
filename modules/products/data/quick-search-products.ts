import { cacheLife, cacheTag } from "next/cache";

import { ProductStatus } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { notDeleted } from "@/shared/lib/prisma";
import { prisma } from "@/shared/lib/prisma";

import { PRODUCTS_CACHE_TAGS } from "../constants/cache";
import { QUICK_SEARCH_SELECT } from "../constants/product.constants";
import { buildRelatedFieldsSearchConditions } from "../services/product-query-builder";
import { splitSearchTerms } from "../utils/search-helpers";
import { SUGGESTION_THRESHOLD_RESULTS } from "./spell-suggestion";
import { fuzzySearchProductIds } from "./fuzzy-search";
import { getSpellSuggestion } from "./spell-suggestion";

// ============================================================================
// TYPES
// ============================================================================

export type QuickSearchProduct = {
	id: string;
	slug: string;
	title: string;
	skus: Array<{
		priceInclTax: number;
		compareAtPrice: number | null;
		inventory: number;
		isDefault: boolean;
		/** Couleurs M2M ordonnées (1re = principale). Vide = aucune couleur renseignée. */
		colors: Array<{
			colorId: string;
			position: number;
			color: { slug: string; name: string; hex: string };
		}>;
		images: Array<{ url: string; blurDataUrl: string | null; altText: string | null }>;
	}>;
};

export type QuickSearchSuccess = {
	kind: "success";
	products: QuickSearchProduct[];
	suggestion: string | null;
	totalCount: number;
};

export type QuickSearchResult = QuickSearchSuccess | { kind: "rate-limited" } | { kind: "error" };

// ============================================================================
// DATA FUNCTION
// ============================================================================

const QUICK_SEARCH_LIMIT = 6;

/**
 * Performs a fuzzy search for the quick search dialog.
 * Returns up to 6 products with a lightweight select,
 * and optionally a spell suggestion if few results are found.
 */
export async function quickSearchProducts(searchTerm: string): Promise<QuickSearchResult> {
	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", products: [], suggestion: null, totalCount: 0 };
	}

	// ⚠️ Le repli sur erreur vit ICI, HORS du scope `"use cache"` de
	// `fetchQuickSearchCore`. À l'intérieur, il retournait normalement, donc Next
	// mettait `{kind:"error"}` EN CACHE pour ce terme pendant toute la fenêtre du
	// profil `catalog` (5 min revalidate / 15 min stale) : tout visiteur cherchant
	// le même terme voyait l'état d'erreur après une simple panne transitoire.
	// Même motif que `get-products.ts` / `skus/data/fetch-skus.ts` (audit
	// recherche 2026-08-01, P1-3). Verrouillé par
	// `quick-search-error-not-cached.regression.test.ts`.
	let core: { products: QuickSearchProduct[]; totalCount: number };
	try {
		core = await fetchQuickSearchCore(term);
	} catch (error) {
		logger.error("Quick search failed", error, { service: "quickSearchProducts" });
		return { kind: "error" };
	}

	// La suggestion vit AUSSI hors du scope cache : `getSpellSuggestion` retombe
	// sur `null` en cas d'échec transitoire, et un `null` de panne ne doit pas
	// être figé dans l'entrée de cache du terme. Le succès, lui, est bien caché
	// par le `"use cache"` propre de la suggestion.
	const suggestion =
		core.products.length < SUGGESTION_THRESHOLD_RESULTS
			? ((await getSpellSuggestion(term, { status: ProductStatus.PUBLIC }))?.term ?? null)
			: null;

	return {
		kind: "success",
		products: core.products,
		suggestion,
		totalCount: core.totalCount,
	};
}

/**
 * Cœur caché de la recherche rapide : fuzzy + exact + fetch des produits.
 *
 * ⚠️ AUCUN try/catch dans ce scope : le repli appartient à `quickSearchProducts`
 * ci-dessus, hors du cache (sinon une erreur transitoire est mise en cache).
 */
async function fetchQuickSearchCore(
	term: string,
): Promise<{ products: QuickSearchProduct[]; totalCount: number }> {
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);

	// 1. Fuzzy search on title/description
	const { ids: fuzzyIds, totalCount: fuzzyTotalCount } = await fuzzySearchProductIds(term, {
		limit: QUICK_SEARCH_LIMIT,
		status: ProductStatus.PUBLIC,
	});

	// 2. Exact search on related fields (type, SKU, color, material, collection)
	//    Only runs when fuzzy returns fewer than QUICK_SEARCH_LIMIT results
	let exactOnlyIds: string[] = [];
	let exactOnlyTotalCount = 0;
	const remainingSlots = QUICK_SEARCH_LIMIT - fuzzyIds.length;

	if (remainingSlots > 0) {
		const words = splitSearchTerms(term);
		if (words.length > 0) {
			const exactConditions = buildRelatedFieldsSearchConditions(words);
			if (exactConditions.length > 0) {
				const exactWhere = {
					AND: [
						...exactConditions,
						{ status: ProductStatus.PUBLIC },
						{ ...notDeleted },
						...(fuzzyIds.length > 0 ? [{ NOT: { id: { in: fuzzyIds } } }] : []),
					],
				};
				const [exactProducts, exactCount] = await Promise.all([
					prisma.product.findMany({
						where: exactWhere,
						select: { id: true },
						take: remainingSlots,
					}),
					prisma.product.count({ where: exactWhere }),
				]);
				exactOnlyIds = exactProducts.map((p) => p.id);
				exactOnlyTotalCount = exactCount;
			}
		}
	}

	// 3. Combine: fuzzy first (relevance-ordered), then exact-only.
	//
	// `totalCount` est EXACT quand la recherche exacte a tourné (fuzzy a alors
	// retourné TOUS ses matches, et la requête exacte les exclut — aucun double
	// comptage possible). Quand le fuzzy remplit les 6 slots (`remainingSlots
	// === 0`), les produits qui ne matchent QUE par les champs liés ne sont pas
	// comptés : sous-comptage assumé — les compter exigerait la liste complète
	// des ids fuzzy (pas seulement le top 6) pour dédupliquer, pour un compte
	// affiché nulle part en chiffre dans le dialog (audit recherche 2026-08-01,
	// P3-2).
	const allIds = [...fuzzyIds, ...exactOnlyIds];
	const totalCount = fuzzyTotalCount + exactOnlyTotalCount;

	// 4. Fetch full products
	const products =
		allIds.length > 0
			? await prisma.product.findMany({
					where: { id: { in: allIds } },
					select: QUICK_SEARCH_SELECT,
				})
			: [];

	// 5. Preserve ordering (fuzzy first, then exact)
	const productMap = new Map(products.map((p) => [p.id, p]));
	const orderedProducts = allIds
		.map((id) => productMap.get(id))
		.filter((p): p is QuickSearchProduct => p !== undefined);

	return { products: orderedProducts, totalCount };
}
