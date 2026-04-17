// ============================================================================
// STATUS LABELS, COLORS & VARIANTS
// Client-safe constants - enum-only Prisma import (no DB client)
// ============================================================================

export const COLLECTION_STATUS_LABELS = {
	DRAFT: "Brouillon",
	PUBLIC: "Publiée",
	ARCHIVED: "Archivée",
} as const;
