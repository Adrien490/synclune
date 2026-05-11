"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
	ACTIVE: "Actif",
	INACTIVE: "Inactif",
	PENDING_DELETION: "Suppression en attente",
	ANONYMIZED: "Anonymisé",
};

function formatUserFilter(filter: FilterDefinition) {
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	if (filterKey === "role") {
		return {
			label: "Rôle",
			displayValue: value === "ADMIN" ? "Admin" : "Utilisateur",
		};
	}

	if (filterKey === "emailVerified") {
		return {
			label: "Email vérifié",
			displayValue: value === "true" ? "Oui" : "Non",
		};
	}

	if (filterKey === "hasOrders") {
		return {
			label: "Commandes",
			displayValue: value === "true" ? "Avec commandes" : "Sans commande",
		};
	}

	if (filterKey === "accountStatus") {
		return {
			label: "Statut",
			displayValue: ACCOUNT_STATUS_LABELS[value] ?? value,
		};
	}

	if (filterKey === "includeDeleted") {
		return {
			label: "Inclure supprimés",
			displayValue: value === "true" ? "Oui" : "Non",
		};
	}

	return {
		label: filterKey,
		displayValue: value,
	};
}

export function UsersFilterBadges() {
	return <FilterBadges formatFilter={formatUserFilter} />;
}
