import { PublicationStatus } from "@/app/generated/prisma/client";
import type { GetCollectionsParams } from "@/modules/collections/data/get-collections";
import { getFirstParam } from "@/shared/utils/params";
import type { CollectionsSearchParams } from "../page";

const VALID_STATUSES = new Set<string>(Object.values(PublicationStatus));

export const parseFilters = (params: CollectionsSearchParams): GetCollectionsParams["filters"] => {
	let hasProducts: boolean | undefined = undefined;
	const statuses: PublicationStatus[] = [];

	Object.entries(params).forEach(([key, value]) => {
		if (!key.startsWith("filter_")) return;

		const filterKey = key.replace("filter_", "");

		if (filterKey === "status") {
			const raw = Array.isArray(value) ? value : [value];
			raw.forEach((v) => {
				if (typeof v === "string" && VALID_STATUSES.has(v)) {
					statuses.push(v as PublicationStatus);
				}
			});
			return;
		}

		const filterValue = getFirstParam(value);
		if (!filterValue) return;

		if (filterKey === "hasProducts") {
			hasProducts = filterValue === "true";
		}
	});

	const uniqueStatuses = Array.from(new Set(statuses));
	const status =
		uniqueStatuses.length === 0
			? undefined
			: uniqueStatuses.length === 1
				? uniqueStatuses[0]
				: uniqueStatuses;

	return {
		hasProducts,
		status,
	};
};
