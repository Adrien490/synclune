import { CollectionStatus } from "@/app/generated/prisma/client";
import type { GetCollectionsParams } from "@/modules/collections/data/get-collections";
import { getFirstParam } from "@/shared/utils/params";
import type { CollectionsSearchParams } from "../page";

export const parseFilters = (
	params: CollectionsSearchParams
): GetCollectionsParams["filters"] => {
	let hasProducts: boolean | undefined = undefined;
	let status: CollectionStatus | undefined = undefined;

	Object.entries(params).forEach(([key, value]) => {
		if (key.startsWith("filter_")) {
			const filterKey = key.replace("filter_", "");
			const filterValue = getFirstParam(value);

			if (filterValue) {
				switch (filterKey) {
					case "hasProducts":
						hasProducts = filterValue === "true";
						break;
				}
			}
		}
	});

	// Parse status from direct param (not filter_)
	const statusParam = getFirstParam(params.status);
	if (statusParam && Object.values(CollectionStatus).includes(statusParam as CollectionStatus)) {
		status = statusParam as CollectionStatus;
	}

	return {
		hasProducts,
		status,
	};
};

export const parseStatus = (params: CollectionsSearchParams): CollectionStatus => {
	const statusParam = getFirstParam(params.status);
	if (statusParam && Object.values(CollectionStatus).includes(statusParam as CollectionStatus)) {
		return statusParam as CollectionStatus;
	}
	return CollectionStatus.PUBLIC; // Default to PUBLIC
};
