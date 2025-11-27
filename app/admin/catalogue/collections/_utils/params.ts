import type { GetCollectionsParams } from "@/modules/collections/data/get-collections";
import { getFirstParam } from "@/shared/utils/params";
import type { CollectionsSearchParams } from "../_types/search-params";

export const parseFilters = (
	params: CollectionsSearchParams
): GetCollectionsParams["filters"] => {
	let hasProducts: boolean | undefined = undefined;

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

	return {
		hasProducts,
	};
};
