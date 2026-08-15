// ============================================================================
// STATUS LABELS — schéma lean (lot 2) : le statut est un booléen `active`.
// ============================================================================

const COLLECTION_STATUS_LABELS = {
	true: "Publiée",
	false: "Brouillon",
} as const;

/** Libellé du statut d'une collection à partir de son booléen `active`. */
export function collectionStatusLabel(active: boolean): string {
	return active ? COLLECTION_STATUS_LABELS.true : COLLECTION_STATUS_LABELS.false;
}
