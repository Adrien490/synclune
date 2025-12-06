import { z } from "zod"

// ============================================================================
// CREATE TESTIMONIAL SCHEMA
// ============================================================================

export const createTestimonialSchema = z.object({
	authorName: z
		.string()
		.min(2, "Le prénom doit contenir au moins 2 caractères")
		.max(50, "Le prénom ne doit pas dépasser 50 caractères")
		.trim(),

	content: z
		.string()
		.min(20, "Le témoignage doit contenir au moins 20 caractères")
		.max(500, "Le témoignage ne doit pas dépasser 500 caractères")
		.trim(),

	imageUrl: z
		.string()
		.url("URL d'image invalide")
		.max(2048, "URL trop longue")
		.optional()
		.transform((val) => val || null),

	isPublished: z.boolean().default(false),
})

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>

// ============================================================================
// UPDATE TESTIMONIAL SCHEMA
// ============================================================================

export const updateTestimonialSchema = createTestimonialSchema.partial().extend({
	id: z.cuid("ID de témoignage invalide"),
})

export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>

// ============================================================================
// TOGGLE PUBLISH SCHEMA
// ============================================================================

export const togglePublishSchema = z.object({
	id: z.cuid("ID de témoignage invalide"),
	isPublished: z.boolean(),
})

export type TogglePublishInput = z.infer<typeof togglePublishSchema>

// ============================================================================
// DELETE TESTIMONIAL SCHEMA
// ============================================================================

export const deleteTestimonialSchema = z.object({
	id: z.cuid("ID de témoignage invalide"),
})

export type DeleteTestimonialInput = z.infer<typeof deleteTestimonialSchema>

// ============================================================================
// ADMIN FILTERS SCHEMA
// ============================================================================

/**
 * Schéma de validation pour les filtres de la liste admin
 */
export const testimonialsFiltersSchema = z.object({
	isPublished: z.boolean().optional(),
	createdAfter: z
		.union([z.string(), z.date()])
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	createdBefore: z
		.union([z.string(), z.date()])
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
})

export type TestimonialsFilters = z.infer<typeof testimonialsFiltersSchema>

/**
 * Schéma de validation pour les paramètres de requête admin
 */
export const getTestimonialsAdminSchema = z.object({
	page: z.coerce.number().min(1, "La page doit être >= 1").default(1),
	perPage: z.coerce
		.number()
		.min(1, "Minimum 1 élément par page")
		.max(100, "Maximum 100 éléments par page")
		.default(20),
	sortBy: z.enum(["createdAt", "authorName"]).optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
	search: z.string().max(255, "Recherche trop longue").optional(),
	filters: testimonialsFiltersSchema.optional(),
})

export type GetTestimonialsAdminInput = z.infer<typeof getTestimonialsAdminSchema>
