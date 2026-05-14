"use client";

import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";

import {
	COLLECTIONS_SORT_LABELS,
	GET_COLLECTIONS_DEFAULT_SORT_BY,
} from "../../constants/collection.constants";

/**
 * Chip mobile "Trié par : X" pour la liste des collections.
 * Visible si sortBy URL !== null. Tap = ouvre SortDrawer. X = reset.
 */
export function CollectionsSortBadge() {
	return (
		<AdminSortBadge
			sortLabels={COLLECTIONS_SORT_LABELS}
			defaultSort={GET_COLLECTIONS_DEFAULT_SORT_BY}
		/>
	);
}
