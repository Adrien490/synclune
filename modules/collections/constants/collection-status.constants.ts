// ============================================================================
// STATUS LABELS & COLORS
// Client-safe constants - no Prisma imports
// ============================================================================

export const COLLECTION_STATUS_LABELS = {
	DRAFT: "Brouillon",
	PUBLIC: "Publiée",
	ARCHIVED: "Archivée",
} as const;

export const COLLECTION_STATUS_COLORS = {
	DRAFT: "#f59e0b", // amber
	PUBLIC: "#22c55e", // green
	ARCHIVED: "#6b7280", // gray
} as const;

export type CollectionStatusKey = keyof typeof COLLECTION_STATUS_LABELS;
