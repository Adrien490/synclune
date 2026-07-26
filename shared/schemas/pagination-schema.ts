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
const PAGE_SPECIFIC_LIMITS = {
	/** Limite pour la liste des produits admin (affichage dense) */
	ADMIN_PRODUCTS: 100,
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
 * Bornes de longueur d'un curseur.
 *
 * ⚠️ Un curseur est un **identifiant de base opaque** : son format appartient à qui
 * le génère, pas à ce schéma. Il en existe déjà deux générateurs distincts ici :
 *
 * | Générateur                          | Modèles                          | Longueur | Alphabet    |
 * | ----------------------------------- | -------------------------------- | -------- | ----------- |
 * | Prisma `@default(cuid(2))`          | les 32 modèles applicatifs       | **24**   | `a-z0-9`    |
 * | Better Auth `generateId()`          | `Session`, `Account`, `Verification` | **32** | `a-zA-Z0-9` |
 *
 * Ce schéma imposait `.length(25)` — une valeur qui ne correspond à **aucun** des
 * deux (25 = cuid v1, jamais utilisé ici : zéro `@default(cuid())` au schéma). Tous
 * les curseurs réels étaient donc rejetés, la validation retombait sur `undefined`,
 * et le serveur renvoyait silencieusement la première page : « Page suivante » était
 * un no-op sur les 11 listes admin et les listes boutique.
 *
 * D'où une validation volontairement **large** : on vérifie la forme (alphanumérique
 * borné, pour ne pas transporter n'importe quoi jusqu'à Prisma) et on laisse la base
 * arbitrer l'existence de l'id. Un curseur inconnu dégrade déjà proprement (le
 * `try/catch` des fonctions `fetch*` renvoie une liste vide). Reserrer sur une
 * longueur exacte est exactement ce qui a produit ce bug — ne pas le refaire.
 */
export const CURSOR_MIN_LENGTH = 20;
export const CURSOR_MAX_LENGTH = 40;

/**
 * Schema Zod pour valider un cursor (id opaque : cuid2 Prisma, id Better Auth, …)
 * Utilisable dans tous les schemas de modules
 */
export const cursorSchema = z
	.string()
	.regex(new RegExp(`^[A-Za-z0-9]{${CURSOR_MIN_LENGTH},${CURSOR_MAX_LENGTH}}$`), {
		message: "Cursor invalide",
	})
	.optional();

/**
 * Schema Zod pour la direction de pagination
 */
export const directionSchema = z.enum(["forward", "backward"]).default("forward");

/**
 * Type pour la direction de pagination
 */
type PaginationDirection = z.infer<typeof directionSchema>;
