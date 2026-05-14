"use client";

import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";

import { SORT_LABELS, SORT_OPTIONS } from "../../constants/refund.constants";

/**
 * Chip mobile "Trié par : X" pour la liste des remboursements.
 */
export function RefundsSortBadge() {
	return <AdminSortBadge sortLabels={SORT_LABELS} defaultSort={SORT_OPTIONS.CREATED_DESC} />;
}
