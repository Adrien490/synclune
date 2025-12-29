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

/**
 * Limites spécifiques à certaines pages
 * Ces valeurs sont utilisées pour des listes spéciales (carousels, sitemaps, etc.)
 */
export const PAGE_SPECIFIC_LIMITS = {
	/** Limite pour la liste des produits admin (affichage dense) */
	ADMIN_PRODUCTS: 100,
	/** Limite pour les notifications de stock admin */
	ADMIN_STOCK_NOTIFICATIONS: 50,
	/** Limites pour les carousels de la homepage */
	HOMEPAGE_CAROUSEL: {
		/** Produits mis en avant */
		FEATURED: 4,
		/** Nouveautés */
		NEW: 8,
		/** Meilleures ventes */
		BESTSELLERS: 6,
	},
	/** Limite pour la génération du sitemap */
	SITEMAP: 200,
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

// ============================================================================
// LEGACY PAGINATION SCHEMA
// ============================================================================

/**
 * Schéma de pagination générique
 * Utilisé pour standardiser les paramètres de pagination dans l'application
 */
export const paginationSchema = () => {
	return z.object({
		page: z.number().min(1).default(1),
		perPage: z.number().min(1).max(100).default(12),
	});
};

export type PaginationParams = z.infer<ReturnType<typeof paginationSchema>>;
