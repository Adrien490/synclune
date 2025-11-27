"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import {
	ORDER_STATUS_LABELS,
	PAYMENT_STATUS_LABELS,
} from "@/shared/constants/order";
import { FilterDefinition } from "@/shared/hooks/use-filter";
import { formatEuro } from "@/shared/utils/format-euro";
import { useSearchParams } from "next/navigation";

function formatOrderFilter(
	filter: FilterDefinition,
	options: {
		searchParams: URLSearchParams;
	}
) {
	const { searchParams } = options;
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	// Gestion du statut de commande
	if (filterKey === "status") {
		const label =
			ORDER_STATUS_LABELS[value as keyof typeof ORDER_STATUS_LABELS];
		return label ? { label: "Statut", displayValue: label } : null;
	}

	// Gestion du statut de paiement
	if (filterKey === "paymentStatus") {
		const label =
			PAYMENT_STATUS_LABELS[value as keyof typeof PAYMENT_STATUS_LABELS];
		return label ? { label: "Paiement", displayValue: label } : null;
	}

	// Gestion du montant (grouper totalMin/totalMax)
	if (filterKey === "totalMin") {
		const priceMin = searchParams.get("filter_totalMin");
		const priceMax = searchParams.get("filter_totalMax");
		const minValue = priceMin ? parseInt(priceMin) : 0;
		const maxValue = priceMax ? parseInt(priceMax) : 10000;

		return {
			label: "Montant",
			displayValue: `${formatEuro(minValue)} - ${formatEuro(maxValue)}`,
		};
	}

	// Ne pas afficher totalMax séparément (déjà géré avec totalMin)
	if (filterKey === "totalMax") {
		return null;
	}

	// Gestion des dates (grouper createdAfter/createdBefore)
	if (filterKey === "createdAfter") {
		const dateFrom = searchParams.get("filter_createdAfter");
		const dateTo = searchParams.get("filter_createdBefore");
		const fromDate = dateFrom
			? new Date(dateFrom).toLocaleDateString("fr-FR")
			: "...";
		const toDate = dateTo
			? new Date(dateTo).toLocaleDateString("fr-FR")
			: "...";

		return {
			label: "Période",
			displayValue: `${fromDate} - ${toDate}`,
		};
	}

	// Ne pas afficher createdBefore séparément
	if (filterKey === "createdBefore") {
		return null;
	}

	// Gestion de l'affichage des supprimées
	if (filterKey === "showDeleted") {
		return {
			label: "Affichage",
			displayValue:
				value === "true"
					? "Supprimées uniquement"
					: "Non supprimées uniquement",
		};
	}

	// Cas par défaut : afficher tel quel
	return {
		label: filterKey,
		displayValue: value,
	};
}

export function OrdersFilterBadges() {
	const searchParams = useSearchParams();

	return (
		<FilterBadges
			formatFilter={(filter) =>
				formatOrderFilter(filter, {
					searchParams,
				})
			}
		/>
	);
}
