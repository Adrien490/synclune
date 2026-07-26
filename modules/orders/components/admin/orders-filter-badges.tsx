"use client";

import { Suspense } from "react";
import { FilterBadges } from "@/shared/components/filter-badges";
import {
	ORDER_STATUS_LABELS,
	PAYMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_LABELS,
	INVOICE_STATUS_LABELS,
} from "@/modules/orders/constants/status-display";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { formatEuro } from "@/shared/utils/format-euro";
import { useSearchParams } from "next/navigation";

function formatOrderFilter(
	filter: FilterDefinition,
	options: {
		searchParams: URLSearchParams;
	},
) {
	const { searchParams } = options;
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	// Gestion du statut de commande
	if (filterKey === "status") {
		const label = ORDER_STATUS_LABELS[value as keyof typeof ORDER_STATUS_LABELS];
		return label ? { label: "Statut", displayValue: label } : null;
	}

	// Gestion du statut de paiement
	if (filterKey === "paymentStatus") {
		const label = PAYMENT_STATUS_LABELS[value as keyof typeof PAYMENT_STATUS_LABELS];
		return label ? { label: "Paiement", displayValue: label } : null;
	}

	// Gestion du statut de traitement
	if (filterKey === "fulfillmentStatus") {
		const label = FULFILLMENT_STATUS_LABELS[value as keyof typeof FULFILLMENT_STATUS_LABELS];
		return label ? { label: "Traitement", displayValue: label } : null;
	}

	// Gestion du statut de facture (Art. 286 CGI — audit fiscal)
	if (filterKey === "invoiceStatus") {
		const label = INVOICE_STATUS_LABELS[value as keyof typeof INVOICE_STATUS_LABELS];
		return label ? { label: "Facture", displayValue: label } : null;
	}

	// Gestion du montant (grouper totalMin/totalMax)
	//
	// ⚠️ `filter_total*` est en EUROS dans l'URL, `formatEuro` attend des CENTIMES :
	// passer la valeur brute affichait le montant 100× trop petit (« 50 € – 200 € »
	// rendu « 0,50 € - 2,00 € »). Les deux bornes sont désormais indépendantes, donc
	// l'une peut être absente — on n'invente plus de plafond par défaut.
	if (filterKey === "totalMin" || filterKey === "totalMax") {
		// Une seule entrée pour la paire : ancrée sur totalMin quand il est présent.
		if (filterKey === "totalMax" && searchParams.has("filter_totalMin")) {
			return null;
		}

		const euros = (raw: string | null) => (raw !== null && raw !== "" ? Number(raw) : null);
		const minEuros = euros(searchParams.get("filter_totalMin"));
		const maxEuros = euros(searchParams.get("filter_totalMax"));
		const asCents = (value: number) => formatEuro(Math.round(value * 100));

		const displayValue =
			minEuros !== null && maxEuros !== null
				? `${asCents(minEuros)} - ${asCents(maxEuros)}`
				: minEuros !== null
					? `à partir de ${asCents(minEuros)}`
					: maxEuros !== null
						? `jusqu'à ${asCents(maxEuros)}`
						: null;

		return displayValue ? { label: "Montant", displayValue } : null;
	}

	// Gestion des dates (grouper createdAfter/createdBefore)
	if (filterKey === "createdAfter") {
		const dateFrom = searchParams.get("filter_createdAfter");
		const dateTo = searchParams.get("filter_createdBefore");
		const fromDate = dateFrom ? new Date(dateFrom).toLocaleDateString("fr-FR") : "...";
		const toDate = dateTo ? new Date(dateTo).toLocaleDateString("fr-FR") : "...";

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
		if (value === "active") return null;
		return {
			label: "Affichage",
			displayValue: value === "deleted" ? "Supprimées uniquement" : "Toutes",
		};
	}

	// Presets booléens maintenance facturation (EINV-UI-005 + EINV-UI-106)
	if (filterKey === "invoiceAnomaly") {
		return { label: "Facturation", displayValue: "Payée sans facture" };
	}
	if (filterKey === "pdfNotArchived") {
		return { label: "Facturation", displayValue: "PDF non archivé" };
	}
	if (filterKey === "retryDeferred") {
		return { label: "Facturation", displayValue: "Retry escaladé" };
	}

	// Cas par défaut : afficher tel quel
	return {
		label: filterKey,
		displayValue: value,
	};
}

function OrdersFilterBadgesInner() {
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

export function OrdersFilterBadges() {
	return (
		<Suspense fallback={null}>
			<OrdersFilterBadgesInner />
		</Suspense>
	);
}
