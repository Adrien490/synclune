import type { PublicationStatus } from "@/app/generated/prisma/client";

/**
 * Matrice des transitions valides pour `PublicationStatus`.
 *
 * - DRAFT  → PUBLIC (publier — nécessite `validateProductForPublication`)
 * - DRAFT  → ARCHIVED (archiver directement)
 * - PUBLIC → DRAFT (dépublier)
 * - PUBLIC → ARCHIVED (archiver)
 * - ARCHIVED → DRAFT (restaurer en brouillon)
 * - ARCHIVED → PUBLIC (restaurer publié — nécessite `validateProductForPublication`)
 *
 * Pas de transition identité (X → X interdit).
 */
const VALID_TRANSITIONS: Record<PublicationStatus, readonly PublicationStatus[]> = {
	DRAFT: ["PUBLIC", "ARCHIVED"],
	PUBLIC: ["DRAFT", "ARCHIVED"],
	ARCHIVED: ["DRAFT", "PUBLIC"],
} as const;

/**
 * Indique si une transition entre deux statuts produit est autorisée par la
 * state machine. Fonction pure — n'effectue aucune validation métier
 * complémentaire (titre, SKUs actifs, stock, image). Appeler
 * `validateProductForPublication` en aval pour les transitions vers PUBLIC.
 */
export function canTransitionProductStatus(
	from: PublicationStatus,
	to: PublicationStatus,
): boolean {
	if (from === to) return false;
	return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Retourne la liste des statuts cibles autorisés depuis un statut donné.
 * Utile pour les dropdowns admin et les guards bulk-action.
 */
export function getAllowedTransitions(from: PublicationStatus): readonly PublicationStatus[] {
	return VALID_TRANSITIONS[from];
}
