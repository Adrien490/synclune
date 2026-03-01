"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { formatStatusFilter } from "@/shared/utils/format-status-filter";
import { type DiscountType } from "@/app/generated/prisma/browser";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discounts/constants/discount.constants";

function formatDiscountFilter(filter: FilterDefinition) {
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	if (filterKey === "type") {
		return {
			label: "Type",
			displayValue: DISCOUNT_TYPE_LABELS[value as DiscountType],
		};
	}

	if (filterKey === "isActive") {
		return formatStatusFilter(value);
	}

	if (filterKey === "hasUsages") {
		return {
			label: "Utilisations",
			displayValue: value === "true" ? "Avec utilisations" : "Sans utilisation",
		};
	}

	return {
		label: filterKey,
		displayValue: value,
	};
}

export function DiscountsFilterBadges() {
	return <FilterBadges formatFilter={formatDiscountFilter} />;
}
