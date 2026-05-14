"use client";

import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";

import { GET_REVIEWS_DEFAULT_SORT_BY, REVIEWS_SORT_LABELS } from "../../constants/review.constants";

/**
 * Chip mobile "Trié par : X" pour la liste des avis.
 * Visible si sortBy URL !== null. Tap = ouvre SortDrawer. X = reset.
 */
export function ReviewsSortBadge() {
	return (
		<AdminSortBadge sortLabels={REVIEWS_SORT_LABELS} defaultSort={GET_REVIEWS_DEFAULT_SORT_BY} />
	);
}
