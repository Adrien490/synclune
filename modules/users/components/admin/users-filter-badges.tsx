"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { FilterDefinition } from "@/shared/hooks/use-filter";

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

	if (filterKey === "marketingOptIn") {
		return {
			label: "Marketing",
			displayValue: value === "true" ? "Accepté" : "Refusé",
		};
	}

	if (filterKey === "preferredLanguage") {
		return {
			label: "Langue",
			displayValue: value.toUpperCase(),
		};
	}

	if (filterKey === "hasOrders") {
		return {
			label: "Commandes",
			displayValue: value === "true" ? "Avec commandes" : "Sans commande",
		};
	}

	if (filterKey === "createdAfter") {
		return {
			label: "Inscrit après",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
		};
	}

	if (filterKey === "createdBefore") {
		return {
			label: "Inscrit avant",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
		};
	}

	if (filterKey === "lastLoginAfter") {
		return {
			label: "Connexion après",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
		};
	}

	if (filterKey === "lastLoginBefore") {
		return {
			label: "Connexion avant",
			displayValue: new Date(value).toLocaleDateString("fr-FR"),
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
