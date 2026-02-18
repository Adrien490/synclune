"use server"

import { z } from "zod"
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers"
import { PRODUCT_SEARCH_LIMIT } from "@/shared/lib/rate-limit-config"

import { quickSearchProducts, type QuickSearchResult } from "../data/quick-search-products"

const EMPTY_RESULT: QuickSearchResult = { products: [], suggestion: null, totalCount: 0 }

const quickSearchSchema = z.string().trim().max(100)

export async function quickSearch(query: string): Promise<QuickSearchResult> {
	try {
		const rateCheck = await enforceRateLimitForCurrentUser(PRODUCT_SEARCH_LIMIT)
		if ("error" in rateCheck) return EMPTY_RESULT

		const parsed = quickSearchSchema.safeParse(query)
		if (!parsed.success) return EMPTY_RESULT

		const sanitizedQuery = parsed.data

		const result = await quickSearchProducts(sanitizedQuery)

		// Structured logging for search analytics (picked up by log aggregator)
		if (result.totalCount === 0) {
			console.log(`[SEARCH] zero-result | term="${sanitizedQuery}" | suggestion="${result.suggestion ?? "none"}"`)
		}

		return result
	} catch {
		return EMPTY_RESULT
	}
}
