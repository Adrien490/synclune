import type { GetProductTypesParams } from "@/modules/product-types/data/get-product-types";
import { getFirstParam } from "@/shared/utils/params";
import type { ProductTypesSearchParams } from "../page";

export const parseFilters = (
	params: ProductTypesSearchParams
): GetProductTypesParams["filters"] => {
	let isActive: boolean | undefined = undefined;
	let isSystem: boolean | undefined = undefined;

	Object.entries(params).forEach(([key, value]) => {
		if (key.startsWith("filter_")) {
			const filterKey = key.replace("filter_", "");
			const filterValue = getFirstParam(value);

			if (filterValue) {
				switch (filterKey) {
					case "isActive":
						isActive = filterValue === "true";
						break;
					case "isSystem":
						isSystem = filterValue === "true";
						break;
				}
			}
		}
	});

	return {
		isActive,
		isSystem,
	};
};
