"use client";

import dynamic from "next/dynamic";

import type {
	QuickSearchCollection,
	QuickSearchProductType,
	RecentlyViewedProduct,
} from "./constants";

const QuickSearchDialog = dynamic(
	() => import("./quick-search-dialog").then((mod) => ({ default: mod.QuickSearchDialog })),
	{
		ssr: false,
		loading: () => null,
	},
);

interface QuickSearchDialogLazyProps {
	recentSearches?: string[];
	collections: QuickSearchCollection[];
	productTypes: QuickSearchProductType[];
	recentlyViewed?: RecentlyViewedProduct[];
}

export function QuickSearchDialogLazy(props: QuickSearchDialogLazyProps) {
	return <QuickSearchDialog {...props} />;
}
