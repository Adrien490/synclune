"use client";

import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";

import { COLORS_SORT_LABELS, GET_COLORS_DEFAULT_SORT_BY } from "../../constants/color.constants";

/**
 * Chip mobile "Trié par : X" pour la liste des couleurs.
 * Visible si sortBy URL !== null. Tap = ouvre SortDrawer. X = reset.
 */
export function ColorsSortBadge() {
	return (
		<AdminSortBadge sortLabels={COLORS_SORT_LABELS} defaultSort={GET_COLORS_DEFAULT_SORT_BY} />
	);
}
