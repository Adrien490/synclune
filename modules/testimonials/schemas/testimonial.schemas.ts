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
