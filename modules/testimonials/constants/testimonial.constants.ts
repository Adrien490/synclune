import type { Prisma } from "@/app/generated/prisma/client"

// ========================================
// Prisma SELECT Definitions
// ========================================

/**
 * SELECT pour l'affichage public des témoignages
 */
export const TESTIMONIAL_LIST_SELECT = {
	id: true,
	authorName: true,
	content: true,
	imageUrl: true,
} as const satisfies Prisma.TestimonialSelect

/**
 * SELECT pour la liste admin des témoignages
 */
export const TESTIMONIAL_ADMIN_SELECT = {
	...TESTIMONIAL_LIST_SELECT,
	isPublished: true,
	createdAt: true,
} as const satisfies Prisma.TestimonialSelect

// ========================================
// Pagination
// ========================================

/**
 * Nombre de témoignages par page par défaut (admin)
 */
export const TESTIMONIALS_DEFAULT_PER_PAGE = 20

/**
 * Nombre maximum de témoignages par page
 */
export const TESTIMONIALS_MAX_PER_PAGE = 100

// ========================================
// Tri (Sort Options)
// ========================================

/**
 * Options de tri disponibles
 */
export const TESTIMONIALS_SORT_OPTIONS = {
	CREATED_DESC: "created-descending",
	CREATED_ASC: "created-ascending",
	AUTHOR_ASC: "author-ascending",
	AUTHOR_DESC: "author-descending",
} as const

/**
 * Labels français pour les options de tri
 */
export const TESTIMONIALS_SORT_LABELS: Record<string, string> = {
	"created-descending": "Date (récent)",
	"created-ascending": "Date (ancien)",
	"author-ascending": "Auteur (A-Z)",
	"author-descending": "Auteur (Z-A)",
}

/**
 * Tri par défaut
 */
export const TESTIMONIALS_DEFAULT_SORT = TESTIMONIALS_SORT_OPTIONS.CREATED_DESC

// ========================================
// Statuts de publication
// ========================================

/**
 * Labels des statuts de publication
 */
export const TESTIMONIAL_PUBLISH_STATUS_LABELS = {
	published: "Publié",
	draft: "Brouillon",
} as const

/**
 * Couleurs des badges de statut (pour l'UI admin)
 */
export const TESTIMONIAL_PUBLISH_STATUS_COLORS = {
	published: "success",
	draft: "secondary",
} as const
