"use client";

import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";

import {
	GET_PRODUCT_TYPES_DEFAULT_SORT_BY,
	PRODUCT_TYPES_SORT_LABELS,
} from "../../constants/product-type.constants";

/**
 * Chip mobile "Trié par : X" pour la liste des types de bijoux.
 * Visible si sortBy URL !== null. Tap = ouvre SortDrawer. X = reset.
 */
export function ProductTypesSortBadge() {
	return (
		<AdminSortBadge
			sortLabels={PRODUCT_TYPES_SORT_LABELS}
			defaultSort={GET_PRODUCT_TYPES_DEFAULT_SORT_BY}
		/>
	);
}
