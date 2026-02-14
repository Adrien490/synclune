"use server"

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers"
import { PRODUCT_SEARCH_LIMIT } from "@/shared/lib/rate-limit-config"

import { quickSearchProducts, type QuickSearchResult } from "../data/quick-search-products"

const EMPTY_RESULT: QuickSearchResult = { products: [], suggestion: null, totalCount: 0 }

export async function quickSearch(query: string): Promise<QuickSearchResult> {
	const rateCheck = await enforceRateLimitForCurrentUser(PRODUCT_SEARCH_LIMIT)
	if ("error" in rateCheck) return EMPTY_RESULT

	return quickSearchProducts(query)
}
