import { Suspense } from "react"

import { getNavbarMenuData } from "@/app/(boutique)/(accueil)/_components/navbar/get-navbar-menu-data"
import { quickSearchProducts } from "@/modules/products/data/quick-search-products"
import { QuickSearchContent } from "@/modules/products/components/quick-search-dialog/quick-search-content"
import { SearchResultsSkeleton } from "@/modules/products/components/quick-search-dialog/search-results-skeleton"
import { SearchErrorFallback } from "@/modules/products/components/quick-search-dialog/search-error-fallback"

type Props = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function QuickSearchSlot({ searchParams }: Props) {
	const params = await searchParams
	const qs = typeof params.qs === "string" ? params.qs.trim() : ""

	if (qs.length < 2) return null

	// Promise NOT awaited - enables streaming via Suspense
	const resultsPromise = quickSearchProducts(qs)

	// Cached menu data (near-instant) for client-side collection/category filtering
	const { collectionsData, productTypesData } = await getNavbarMenuData()

	const collections = collectionsData.collections.map((c) => {
		const firstImage = c.products[0]?.product?.skus[0]?.images[0]
		return {
			slug: c.slug,
			name: c.name,
			productCount: c._count.products,
			image: firstImage
				? { url: firstImage.url, blurDataUrl: firstImage.blurDataUrl }
				: null,
		}
	})

	const productTypes = productTypesData.productTypes.map((t) => ({
		slug: t.slug,
		label: t.label,
	}))

	return (
		<SearchErrorFallback>
			<Suspense fallback={<SearchResultsSkeleton />}>
				<QuickSearchContent
					resultsPromise={resultsPromise}
					query={qs}
					collections={collections}
					productTypes={productTypes}
				/>
			</Suspense>
		</SearchErrorFallback>
	)
}
