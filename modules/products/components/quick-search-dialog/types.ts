export type RecentlyViewedProduct = {
	slug: string
	title: string
	price: number
	image: { url: string; blurDataUrl: string | null } | null
}

export type QuickSearchCollection = {
	slug: string
	name: string
	productCount: number
	image: { url: string; blurDataUrl: string | null } | null
	images: { url: string; blurDataUrl?: string | null; alt?: string | null }[]
}

export type QuickSearchProductType = {
	slug: string
	label: string
}
