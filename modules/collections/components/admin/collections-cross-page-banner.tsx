"use client";

import { AdminCrossPageBanner } from "@/shared/components/admin/admin-cross-page-banner";

import { getFilteredCollectionIds } from "../../actions/get-filtered-collection-ids";
import {
	BULK_COLLECTION_ACTION_LIMIT,
	GET_COLLECTIONS_DEFAULT_SORT_BY,
} from "../../constants/collection.constants";
import type { CollectionFilters, GetCollectionsParams } from "../../types/collection.types";

interface CollectionsCrossPageBannerProps {
	totalCount: number;
	filterParams: {
		search?: string;
		sortBy?: GetCollectionsParams["sortBy"];
		filters?: CollectionFilters;
	};
	className?: string;
}

export function CollectionsCrossPageBanner({
	totalCount,
	filterParams,
	className,
}: CollectionsCrossPageBannerProps) {
	const params: Pick<GetCollectionsParams, "search" | "sortBy" | "filters"> = {
		search: filterParams.search,
		sortBy: filterParams.sortBy ?? GET_COLLECTIONS_DEFAULT_SORT_BY,
		filters: filterParams.filters,
	};
	return (
		<AdminCrossPageBanner
			totalCount={totalCount}
			filterParams={params}
			getFilteredIds={getFilteredCollectionIds}
			cap={BULK_COLLECTION_ACTION_LIMIT}
			itemLabel={{ singular: "collection", plural: "collections" }}
			className={className}
		/>
	);
}
