// ============================================================================
// SORT OPTIONS
// ============================================================================

export const SORT_OPTIONS = {
	CREATED_DESC: "createdAt_desc",
	CREATED_ASC: "createdAt_asc",
	STATUS_ASC: "status_asc",
} as const;

export type SortOption = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS];

export const SORT_LABELS: Record<SortOption, string> = {
	[SORT_OPTIONS.CREATED_DESC]: "Plus récentes",
	[SORT_OPTIONS.CREATED_ASC]: "Plus anciennes",
	[SORT_OPTIONS.STATUS_ASC]: "Par statut",
};

// ============================================================================
// STATUS FILTER OPTIONS
// ============================================================================

export const STATUS_FILTER_OPTIONS = [
	{ value: "ALL", label: "Tous les statuts" },
	{ value: "PENDING", label: "En attente" },
	{ value: "IN_PROGRESS", label: "En cours" },
	{ value: "COMPLETED", label: "Terminé" },
	{ value: "CANCELLED", label: "Annulé" },
] as const;
