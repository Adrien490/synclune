import type { Prisma } from "@/app/generated/prisma/client"

// ============================================
// CONFIGURATION
// ============================================

/**
 * Configuration du système d'avis
 */
export const REVIEW_CONFIG = {
	/** Note minimale */
	MIN_RATING: 1,
	/** Note maximale */
	MAX_RATING: 5,
	/** Longueur max du titre */
	MAX_TITLE_LENGTH: 150,
	/** Longueur min du contenu */
	MIN_CONTENT_LENGTH: 10,
	/** Longueur max du contenu */
	MAX_CONTENT_LENGTH: 2000,
	/** Nombre max de photos par avis */
	MAX_MEDIA_COUNT: 3,
	/** Nombre d'avis par page par défaut */
	DEFAULT_PER_PAGE: 10,
	/** Nombre max d'avis par page */
	MAX_PER_PAGE: 50,
	/** Longueur max de la réponse admin */
	MAX_RESPONSE_LENGTH: 1000,
} as const

// ============================================
// Prisma SELECT Definitions
// ============================================

/**
 * SELECT pour l'affichage public des avis (storefront)
 */
export const REVIEW_PUBLIC_SELECT = {
	id: true,
	rating: true,
	title: true,
	content: true,
	createdAt: true,
	user: {
		select: {
			name: true,
			image: true,
		},
	},
	medias: {
		select: {
			id: true,
			url: true,
			blurDataUrl: true,
			altText: true,
		},
		orderBy: { position: "asc" as const },
	},
	response: {
		select: {
			content: true,
			authorName: true,
			createdAt: true,
		},
	},
} as const satisfies Prisma.ProductReviewSelect

/**
 * SELECT pour la liste admin des avis
 */
export const REVIEW_ADMIN_SELECT = {
	id: true,
	rating: true,
	title: true,
	content: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	user: {
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
		},
	},
	product: {
		select: {
			id: true,
			title: true,
			slug: true,
		},
	},
	medias: {
		select: {
			id: true,
			url: true,
			blurDataUrl: true,
			altText: true,
		},
		orderBy: { position: "asc" as const },
	},
	response: {
		select: {
			id: true,
			content: true,
			authorId: true,
			authorName: true,
			createdAt: true,
			updatedAt: true,
		},
	},
} as const satisfies Prisma.ProductReviewSelect

/**
 * SELECT pour la page "Mes avis" (espace client)
 */
export const REVIEW_USER_SELECT = {
	id: true,
	rating: true,
	title: true,
	content: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	product: {
		select: {
			id: true,
			title: true,
			slug: true,
			skus: {
				where: { isDefault: true },
				take: 1,
				select: {
					images: {
						where: { isPrimary: true },
						take: 1,
						select: {
							url: true,
							blurDataUrl: true,
							altText: true,
						},
					},
				},
			},
		},
	},
	medias: {
		select: {
			id: true,
			url: true,
			blurDataUrl: true,
			altText: true,
		},
		orderBy: { position: "asc" as const },
	},
	response: {
		select: {
			content: true,
			authorName: true,
			createdAt: true,
		},
	},
} as const satisfies Prisma.ProductReviewSelect

/**
 * SELECT pour les statistiques d'un produit
 */
export const REVIEW_STATS_SELECT = {
	totalCount: true,
	averageRating: true,
	rating1Count: true,
	rating2Count: true,
	rating3Count: true,
	rating4Count: true,
	rating5Count: true,
} as const satisfies Prisma.ProductReviewStatsSelect

// ============================================
// Statuts et labels
// ============================================

/**
 * Labels des statuts de modération
 */
export const REVIEW_STATUS_LABELS = {
	PUBLISHED: "Publié",
	HIDDEN: "Masqué",
} as const

/**
 * Couleurs des badges de statut (pour l'UI admin)
 */
export const REVIEW_STATUS_COLORS = {
	PUBLISHED: "success",
	HIDDEN: "secondary",
} as const

// ============================================
// Tri (Sort Options)
// ============================================

/**
 * Options de tri disponibles
 */
export const REVIEW_SORT_OPTIONS = {
	RECENT: "recent",
	OLDEST: "oldest",
	HIGHEST_RATING: "highest-rating",
	LOWEST_RATING: "lowest-rating",
} as const

/**
 * Labels français pour les options de tri
 */
export const REVIEW_SORT_LABELS: Record<string, string> = {
	recent: "Plus récents",
	oldest: "Plus anciens",
	"highest-rating": "Meilleures notes",
	"lowest-rating": "Notes les plus basses",
}

/**
 * Tri par défaut
 */
export const REVIEW_DEFAULT_SORT = REVIEW_SORT_OPTIONS.RECENT

// ============================================
// Constantes unifiées (pattern get-products.ts)
// ============================================

/**
 * Tri par défaut pour l'API unifiée
 */
export const GET_REVIEWS_DEFAULT_SORT_BY = "createdAt-desc"

/**
 * Tri par défaut admin si aucun tri explicite fourni
 */
export const GET_REVIEWS_ADMIN_FALLBACK_SORT_BY = "createdAt-desc"

/**
 * Nombre de résultats par page par défaut
 */
export const GET_REVIEWS_DEFAULT_PER_PAGE = REVIEW_CONFIG.DEFAULT_PER_PAGE

/**
 * Nombre maximum de résultats par page
 */
export const GET_REVIEWS_MAX_PER_PAGE = REVIEW_CONFIG.MAX_PER_PAGE

/**
 * Champs de tri disponibles
 */
export const GET_REVIEWS_SORT_FIELDS = [
	"createdAt-desc",
	"createdAt-asc",
	"rating-desc",
	"rating-asc",
	"updatedAt-desc",
	"updatedAt-asc",
] as const

/**
 * Labels français pour les champs de tri
 */
export const REVIEW_SORT_FIELD_LABELS: Record<string, string> = {
	"createdAt-desc": "Plus récents",
	"createdAt-asc": "Plus anciens",
	"rating-desc": "Meilleures notes",
	"rating-asc": "Notes les plus basses",
	"updatedAt-desc": "Modifié récemment",
	"updatedAt-asc": "Modifié anciennement",
}

// ============================================
// Schema.org / Rich Snippets
// ============================================

/**
 * Configuration pour les rich snippets Google
 */
export const REVIEW_SCHEMA_ORG = {
	"@type": "AggregateRating",
	bestRating: REVIEW_CONFIG.MAX_RATING,
	worstRating: REVIEW_CONFIG.MIN_RATING,
} as const

// ============================================
// Dialog IDs
// ============================================

/** ID du dialog de modification d'avis */
export const EDIT_REVIEW_DIALOG_ID = "edit-review"

/** ID du dialog de suppression d'avis */
export const DELETE_REVIEW_DIALOG_ID = "delete-review"

// ============================================
// Messages d'erreur
// ============================================

/**
 * Messages d'erreur pour les Server Actions
 */
export const REVIEW_ERROR_MESSAGES = {
	CREATE_FAILED: "Erreur lors de la création de l'avis",
	UPDATE_FAILED: "Erreur lors de la modification de l'avis",
	DELETE_FAILED: "Erreur lors de la suppression de l'avis",
	NOT_FOUND: "Avis introuvable",
	ALREADY_REVIEWED: "Vous avez déjà laissé un avis pour ce produit",
	NO_PURCHASE: "Vous devez avoir acheté ce produit pour laisser un avis",
	ORDER_NOT_DELIVERED: "Votre commande doit être livrée avant de laisser un avis",
	NOT_OWNER: "Vous n'êtes pas autorisé à modifier cet avis",
	MODERATE_FAILED: "Erreur lors de la modération",
	RESPONSE_CREATE_FAILED: "Erreur lors de la création de la réponse",
	RESPONSE_UPDATE_FAILED: "Erreur lors de la modification de la réponse",
	RESPONSE_DELETE_FAILED: "Erreur lors de la suppression de la réponse",
	RESPONSE_ALREADY_EXISTS: "Cet avis a déjà une réponse",
	RESPONSE_NOT_FOUND: "Réponse introuvable",
	EMAIL_FAILED: "Erreur lors de l'envoi de l'email",
	RATE_LIMIT: "Trop de tentatives. Réessayez plus tard.",
	INVALID_DATA: "Données invalides",
} as const
