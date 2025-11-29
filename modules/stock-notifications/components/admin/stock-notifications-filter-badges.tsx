"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import type { FilterDefinition } from "@/shared/hooks/use-filter";
import { STOCK_NOTIFICATION_STATUS_LABELS } from "../../constants/stock-notification.constants";
import { StockNotificationStatus } from "@/app/generated/prisma/client";

function formatStockNotificationFilter(
	filter: FilterDefinition
): { label: string; displayValue: string } | null {
	const { key, value } = filter;

	// Ignorer si pas de valeur
	if (value === undefined || value === null) return null;

	const stringValue = String(value);

	// Filtre par statut
	if (key === "filter_status") {
		const statusLabel =
			STOCK_NOTIFICATION_STATUS_LABELS[stringValue as StockNotificationStatus] ||
			stringValue;
		return {
			label: "Statut",
			displayValue: statusLabel,
		};
	}

	// Recherche
	if (key === "search") {
		return {
			label: "Recherche",
			displayValue: stringValue,
		};
	}

	return null;
}

export function StockNotificationsFilterBadges() {
	return <FilterBadges formatFilter={formatStockNotificationFilter} />;
}
