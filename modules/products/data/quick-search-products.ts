import "server-only"

import { ProductStatus } from "@/app/generated/prisma/client"
import { prisma } from "@/shared/lib/prisma"

import { QUICK_SEARCH_SELECT } from "../constants/product.constants"
import { SUGGESTION_THRESHOLD_RESULTS } from "./spell-suggestion"
import { fuzzySearchProductIds } from "./fuzzy-search"
import { getSpellSuggestion } from "./spell-suggestion"

// ============================================================================
// TYPES
// ============================================================================

export type QuickSearchProduct = {
	id: string
	slug: string
	title: string
	skus: Array<{
		priceInclTax: number
		compareAtPrice: number | null
		inventory: number
		isDefault: boolean
		color: { slug: string; name: string; hex: string } | null
		images: Array<{ url: string; blurDataUrl: string | null; altText: string | null }>
	}>
}

export type QuickSearchResult = {
	products: QuickSearchProduct[]
	suggestion: string | null
	totalCount: number
}

// ============================================================================
// DATA FUNCTION
// ============================================================================

const QUICK_SEARCH_LIMIT = 6

/**
 * Performs a fuzzy search for the quick search dialog.
 * Returns up to 6 products with a lightweight select,
 * and optionally a spell suggestion if few results are found.
 */
export async function quickSearchProducts(
	searchTerm: string
): Promise<QuickSearchResult> {
	const term = searchTerm.trim()
	if (!term || term.length < 2) {
		return { products: [], suggestion: null, totalCount: 0 }
	}

	// Search for product IDs using fuzzy search
	const { ids: productIds, totalCount } = await fuzzySearchProductIds(term, {
		limit: QUICK_SEARCH_LIMIT,
		status: ProductStatus.PUBLIC,
	})

	// Fetch products and optionally spell suggestion in parallel
	const shouldSuggest = productIds.length < SUGGESTION_THRESHOLD_RESULTS

	const [products, spellResult] = await Promise.all([
		productIds.length > 0
			? prisma.product.findMany({
					where: { id: { in: productIds } },
					select: QUICK_SEARCH_SELECT,
				})
			: Promise.resolve([]),
		shouldSuggest
			? getSpellSuggestion(term, { status: ProductStatus.PUBLIC })
			: Promise.resolve(null),
	])

	// Preserve relevance ordering from fuzzy search
	const productMap = new Map(products.map((p) => [p.id, p]))
	const orderedProducts = productIds
		.map((id) => productMap.get(id))
		.filter((p): p is QuickSearchProduct => p !== undefined)

	return {
		products: orderedProducts,
		suggestion: spellResult?.term ?? null,
		totalCount,
	}
}
