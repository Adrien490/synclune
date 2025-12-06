import type { Testimonial } from "@/app/generated/prisma/client"

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Témoignage complet depuis la base de données
 */
export type TestimonialRecord = Testimonial

/**
 * Témoignage pour affichage (sans champs internes)
 */
export type TestimonialDisplay = Pick<
	Testimonial,
	"id" | "authorName" | "content" | "imageUrl"
>

/**
 * Témoignage pour la liste admin
 */
export type TestimonialListItem = Pick<
	Testimonial,
	"id" | "authorName" | "content" | "imageUrl" | "isPublished" | "createdAt"
>

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Options de tri
 */
export type TestimonialSortBy = "createdAt" | "authorName"
export type TestimonialSortOrder = "asc" | "desc"

/**
 * Options de filtrage et pagination pour la liste admin
 */
export interface TestimonialFilters {
	// Filtres
	isPublished?: boolean
	search?: string
	createdAfter?: Date
	createdBefore?: Date
	// Pagination
	page?: number
	perPage?: number
	// Tri
	sortBy?: TestimonialSortBy
	sortOrder?: TestimonialSortOrder
}

/**
 * Résultat paginé pour l'admin
 */
export interface TestimonialListResult {
	testimonials: TestimonialListItem[]
	total: number
	page: number
	perPage: number
	totalPages: number
}
