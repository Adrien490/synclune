"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";

import { REFUND_REASON_LABELS, REFUND_STATUS_LABELS } from "../../constants/refund.constants";
import type { RefundReason, RefundStatus } from "@/app/generated/prisma/browser";

function formatDate(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return format(parsed, "d MMM yyyy", { locale: fr });
}

function formatRefundFilter(filter: FilterDefinition) {
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	if (filterKey === "status") {
		const label = REFUND_STATUS_LABELS[value as RefundStatus] as string | undefined;
		return { label: "Statut", displayValue: label ?? value };
	}

	if (filterKey === "reason") {
		const label = REFUND_REASON_LABELS[value as RefundReason] as string | undefined;
		return { label: "Motif", displayValue: label ?? value };
	}

	if (filterKey === "createdAfter") {
		return { label: "Du", displayValue: formatDate(value) };
	}

	if (filterKey === "createdBefore") {
		return { label: "Au", displayValue: formatDate(value) };
	}

	return { label: filterKey, displayValue: value };
}

/**
 * Badges des filtres actifs pour la liste remboursements admin.
 */
export function RefundsFilterBadges() {
	return <FilterBadges formatFilter={formatRefundFilter} />;
}
