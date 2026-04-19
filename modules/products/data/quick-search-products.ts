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
		color: { slug: string; name: string; hex: string } | null;
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
	"use cache";
	cacheLife("catalog");
	cacheTag(PRODUCTS_CACHE_TAGS.LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", products: [], suggestion: null, totalCount: 0 };
	}

	try {
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

		// 3. Combine: fuzzy first (relevance-ordered), then exact-only
		const allIds = [...fuzzyIds, ...exactOnlyIds];
		const totalCount = fuzzyTotalCount + exactOnlyTotalCount;

		// 4. Fetch full products + spell suggestion in parallel
		const shouldSuggest = allIds.length < SUGGESTION_THRESHOLD_RESULTS;

		const [products, spellResult] = await Promise.all([
			allIds.length > 0
				? prisma.product.findMany({
						where: { id: { in: allIds } },
						select: QUICK_SEARCH_SELECT,
					})
				: Promise.resolve([]),
			shouldSuggest
				? getSpellSuggestion(term, { status: ProductStatus.PUBLIC })
				: Promise.resolve(null),
		]);

		// 5. Preserve ordering (fuzzy first, then exact)
		const productMap = new Map(products.map((p) => [p.id, p]));
		const orderedProducts = allIds
			.map((id) => productMap.get(id))
			.filter((p): p is QuickSearchProduct => p !== undefined);

		return {
			kind: "success",
			products: orderedProducts,
			suggestion: spellResult?.term ?? null,
			totalCount,
		};
	} catch (error) {
		logger.error("Quick search failed", error, { service: "quickSearchProducts" });
		return { kind: "error" };
	}
}
