"use server"

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers"
import { PRODUCT_SEARCH_LIMIT } from "@/shared/lib/rate-limit-config"

import { quickSearchProducts, type QuickSearchResult } from "../data/quick-search-products"

const EMPTY_RESULT: QuickSearchResult = { products: [], suggestion: null, totalCount: 0 }

export async function quickSearch(query: string): Promise<QuickSearchResult> {
	const rateCheck = await enforceRateLimitForCurrentUser(PRODUCT_SEARCH_LIMIT)
	if ("error" in rateCheck) return EMPTY_RESULT

	const result = await quickSearchProducts(query)

	// Structured logging for search analytics (picked up by log aggregator)
	if (result.totalCount === 0) {
		console.log(`[SEARCH] zero-result | term="${query.trim()}" | suggestion="${result.suggestion ?? "none"}"`)
	}

	return result
}
