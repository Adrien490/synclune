"use server"

import { quickSearchProducts, type QuickSearchResult } from "../data/quick-search-products"

export async function quickSearch(query: string): Promise<QuickSearchResult> {
	return quickSearchProducts(query)
}
