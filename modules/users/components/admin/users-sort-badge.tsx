"use client";

import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";

import { USERS_SORT_LABELS, USERS_SORT_OPTIONS } from "../../constants/user.constants";

/**
 * Chip mobile "Trié par : X" pour la liste des clients.
 */
export function UsersSortBadge() {
	return (
		<AdminSortBadge sortLabels={USERS_SORT_LABELS} defaultSort={USERS_SORT_OPTIONS.CREATED_DESC} />
	);
}
