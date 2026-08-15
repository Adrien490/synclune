import type { GetProductTypesParams } from "@/modules/product-types/data/get-product-types";
import { getFirstParam } from "@/shared/utils/params";
import type { ProductTypesSearchParams } from "../page";

/**
 * Schéma lean : ProductType n'a plus de statut ni de flag système — seul le
 * filtre `hasProducts` survit.
 */
export const parseFilters = (
	params: ProductTypesSearchParams,
): GetProductTypesParams["filters"] => {
	let hasProducts: boolean | undefined = undefined;

	Object.entries(params).forEach(([key, value]) => {
		if (!key.startsWith("filter_")) return;
		const filterKey = key.replace("filter_", "");
		const filterValue = getFirstParam(value);
		if (filterValue && filterKey === "hasProducts") {
			hasProducts = filterValue === "true";
		}
	});

	return { hasProducts };
};
