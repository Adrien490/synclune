"use client";

import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";

import {
	GET_MATERIALS_DEFAULT_SORT_BY,
	MATERIALS_SORT_LABELS,
} from "../../constants/materials.constants";

/**
 * Chip mobile "Trié par : X" pour la liste des matériaux.
 * Visible si sortBy URL !== null. Tap = ouvre SortDrawer. X = reset.
 */
export function MaterialsSortBadge() {
	return (
		<AdminSortBadge
			sortLabels={MATERIALS_SORT_LABELS}
			defaultSort={GET_MATERIALS_DEFAULT_SORT_BY}
		/>
	);
}
