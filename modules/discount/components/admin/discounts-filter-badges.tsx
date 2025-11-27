"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { FilterDefinition } from "@/shared/hooks/use-filter";
import { DiscountType } from "@/app/generated/prisma/browser";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discount/constants/discount.constants";

function formatDiscountFilter(filter: FilterDefinition) {
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	if (filterKey === "type") {
		return {
			label: "Type",
			displayValue: DISCOUNT_TYPE_LABELS[value as DiscountType] || value,
		};
	}

	if (filterKey === "isActive") {
		return {
			label: "Statut",
			displayValue: value === "true" ? "Actifs" : "Inactifs",
		};
	}

	if (filterKey === "hasUsages") {
		return {
			label: "Utilisations",
			displayValue: value === "true" ? "Avec utilisations" : "Sans utilisation",
		};
	}

	if (filterKey === "isExpired") {
		return {
			label: "Validité",
			displayValue: value === "true" ? "Expirés" : "Valides",
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
