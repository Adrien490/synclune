import { z } from "zod";

// ============================================================================
// PAGINATION LIMITS
// ============================================================================

/**
 * Limites de pagination centralisées par contexte
 * Ces valeurs servent de référence et peuvent être ajustées par module si nécessaire
 */
export const PAGINATION_LIMITS = {
	/** Limite maximale pour les listes admin (data tables) */
	MAX_ADMIN: 200,
	/** Limite maximale pour les listes publiques (boutique) */
	MAX_PUBLIC: 50,
	/** Limite maximale pour les listes utilisateur (commandes, favoris) */
	MAX_USER: 100,
} as const;

/**
 * Valeurs par défaut de pagination par contexte
 */
export const PAGINATION_DEFAULTS = {
	/** Défaut pour les listes admin */
	ADMIN: 20,
	/** Défaut pour les listes publiques */
	PUBLIC: 20,
	/** Défaut pour les listes utilisateur */
	USER: 10,
	/** Défaut pour les listes compactes (dashboard, aperçus) */
	COMPACT: 5,
} as const;

// ============================================================================
// CURSOR VALIDATION
// ============================================================================

/**
 * Longueur standard d'un CUID Prisma
 */
export const CUID_LENGTH = 25;

/**
 * Schema Zod pour valider un cursor (CUID de 25 caractères)
 * Utilisable dans tous les schemas de modules
 */
export const cursorSchema = z
	.string()
	.length(CUID_LENGTH, { message: "Cursor invalide" })
	.optional();

/**
 * Schema Zod pour la direction de pagination
 */
export const directionSchema = z
	.enum(["forward", "backward"])
	.default("forward");

/**
 * Type pour la direction de pagination
 */
export type PaginationDirection = z.infer<typeof directionSchema>;
