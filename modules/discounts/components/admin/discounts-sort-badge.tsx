"use client";

import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";

import {
	DISCOUNTS_SORT_LABELS,
	GET_DISCOUNTS_DEFAULT_SORT_BY,
} from "../../constants/discount.constants";

/**
 * Chip mobile "Trié par : X" pour la liste des codes promo.
 */
export function DiscountsSortBadge() {
	return (
		<AdminSortBadge
			sortLabels={DISCOUNTS_SORT_LABELS}
			defaultSort={GET_DISCOUNTS_DEFAULT_SORT_BY}
		/>
	);
}
