export const SORT_OPTIONS = {
	CREATED_AT_DESC: "createdAt-descending",
	CREATED_AT_ASC: "createdAt-ascending",
	NAME_ASC: "name-ascending",
	NAME_DESC: "name-descending",
	ORDER_COUNT_DESC: "orderCount-descending",
	ORDER_COUNT_ASC: "orderCount-ascending",
	ORDER_TOTAL_DESC: "orderTotal-descending",
	ORDER_TOTAL_ASC: "orderTotal-ascending",
} as const;

export const SORT_LABELS: Record<
	(typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS],
	string
> = {
	"createdAt-descending": "Date d'inscription (récent)",
	"createdAt-ascending": "Date d'inscription (ancien)",
	"name-ascending": "Nom (A-Z)",
	"name-descending": "Nom (Z-A)",
	"orderCount-descending": "Nombre de commandes (↓)",
	"orderCount-ascending": "Nombre de commandes (↑)",
	"orderTotal-descending": "Total dépensé (↓)",
	"orderTotal-ascending": "Total dépensé (↑)",
};

export const DEFAULT_SORT_BY = SORT_OPTIONS.CREATED_AT_DESC;

// Helper pour convertir le format de tri du dashboard vers l'API get-users
export function parseSortBy(sortBy: string): {
	sortBy: "name" | "email" | "role" | "createdAt" | "updatedAt";
	sortOrder: "asc" | "desc";
} {
	const [field, order] = sortBy.split("-");

	// Mapper les champs du dashboard vers les champs get-users
	let mappedField: "name" | "email" | "role" | "createdAt" | "updatedAt";
	if (field === "orderCount" || field === "orderTotal") {
		mappedField = "createdAt"; // Fallback pour les champs spéciaux
	} else if (field === "name" || field === "email" || field === "role" || field === "createdAt" || field === "updatedAt") {
		mappedField = field;
	} else {
		mappedField = "createdAt"; // Fallback par défaut
	}

	return {
		sortBy: mappedField,
		sortOrder: order === "ascending" ? "asc" : "desc",
	};
}
