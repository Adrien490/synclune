import { z } from "zod"

/**
 * Schema de validation pour les slugs de produits recemment vus
 *
 * Contraintes:
 * - Longueur: 1-100 caracteres
 * - Format: lowercase alphanumerique avec tirets
 */
export const recentProductSlugSchema = z
	.string()
	.min(1, "Slug requis")
	.max(100, "Slug trop long")
	.regex(/^[a-z0-9-]+$/, "Format slug invalide")

export type RecentProductSlug = z.infer<typeof recentProductSlugSchema>
