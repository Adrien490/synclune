import type { GetCollectionsParams } from "@/modules/collections/data/get-collections";
import { getFirstParam } from "@/shared/utils/params";
import type { CollectionsSearchParams } from "../page";

/**
 * Schéma lean : le statut d'une collection est le booléen `active` — le filtre
 * URL est `filter_active=true|false` (multi-select toléré : les deux valeurs
 * simultanées annulent le filtre).
 */
export const parseFilters = (params: CollectionsSearchParams): GetCollectionsParams["filters"] => {
	let hasProducts: boolean | undefined = undefined;
	const actives = new Set<boolean>();

	Object.entries(params).forEach(([key, value]) => {
		if (!key.startsWith("filter_")) return;

		const filterKey = key.replace("filter_", "");

		if (filterKey === "active") {
			const raw = Array.isArray(value) ? value : [value];
			raw.forEach((v) => {
				if (v === "true") actives.add(true);
				else if (v === "false") actives.add(false);
			});
			return;
		}

		const filterValue = getFirstParam(value);
		if (!filterValue) return;

		if (filterKey === "hasProducts") {
			hasProducts = filterValue === "true";
		}
	});

	return {
		hasProducts,
		active: actives.size === 1 ? [...actives][0] : undefined,
	};
};
