import { z } from "zod";

// ============================================================================
// GALLERY URL PARAMS VALIDATION
// ============================================================================

/**
 * Schema de validation pour un slug de variante
 * Utilisé pour valider les paramètres URL color/material
 */
export const variantSlugSchema = z.string().regex(/^[a-z0-9-]+$/).max(50).optional();

/**
 * Schema de validation pour les paramètres de galerie
 * Valide les query params pour éviter les injections
 */
export const galleryParamsSchema = z.object({
	color: variantSlugSchema,
	material: variantSlugSchema,
	size: z.string().max(20).optional(),
});

export type GalleryParams = z.infer<typeof galleryParamsSchema>;
