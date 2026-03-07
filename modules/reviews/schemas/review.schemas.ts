import { z } from "zod";
import { isAllowedMediaDomain } from "@/shared/lib/media-validation";
import { REVIEW_CONFIG } from "../constants/review.constants";

// ============================================================================
// MEDIA SCHEMA
// ============================================================================

/**
 * Schéma pour un média d'avis (photo)
 */
export const reviewMediaSchema = z.object({
	url: z.string().url("URL de média invalide").refine(isAllowedMediaDomain, {
		message: "L'URL du média doit provenir d'UploadThing",
	}),
	blurDataUrl: z
		.string()
		.startsWith("data:image/", "Le blurDataUrl doit être un data URI image")
		.max(5000, "BlurDataUrl trop long")
		.optional(),
	altText: z.string().max(255, "Texte alternatif trop long").optional(),
});

export type ReviewMediaInput = z.infer<typeof reviewMediaSchema>;

// ============================================================================
// CREATE REVIEW SCHEMA
// ============================================================================

/**
 * Schéma de validation pour la création d'un avis
 */
export const createReviewSchema = z.object({
	productId: z.cuid2("ID de produit invalide"),

	orderItemId: z.cuid2("ID de commande invalide"),

	rating: z.coerce
		.number()
		.int("La note doit être un nombre entier")
		.min(REVIEW_CONFIG.MIN_RATING, `La note minimum est ${REVIEW_CONFIG.MIN_RATING}`)
		.max(REVIEW_CONFIG.MAX_RATING, `La note maximum est ${REVIEW_CONFIG.MAX_RATING}`),

	title: z
		.string()
		.max(
			REVIEW_CONFIG.MAX_TITLE_LENGTH,
			`Le titre ne doit pas dépasser ${REVIEW_CONFIG.MAX_TITLE_LENGTH} caractères`,
		)
		.trim()
		.optional()
		.transform((val) => (val === "" || val === undefined ? null : val)),

	content: z
		.string()
		.min(
			REVIEW_CONFIG.MIN_CONTENT_LENGTH,
			`L'avis doit contenir au moins ${REVIEW_CONFIG.MIN_CONTENT_LENGTH} caractères`,
		)
		.max(
			REVIEW_CONFIG.MAX_CONTENT_LENGTH,
			`L'avis ne doit pas dépasser ${REVIEW_CONFIG.MAX_CONTENT_LENGTH} caractères`,
		)
		.trim(),

	media: z
		.array(reviewMediaSchema)
		.max(REVIEW_CONFIG.MAX_MEDIA_COUNT, `Maximum ${REVIEW_CONFIG.MAX_MEDIA_COUNT} photos`)
		.default([]),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ============================================================================
// UPDATE REVIEW SCHEMA
// ============================================================================

/**
 * Schéma de validation pour la modification d'un avis
 */
export const updateReviewSchema = z.object({
	id: z.cuid2("ID d'avis invalide"),

	rating: z.coerce
		.number()
		.int("La note doit être un nombre entier")
		.min(REVIEW_CONFIG.MIN_RATING, `La note minimum est ${REVIEW_CONFIG.MIN_RATING}`)
		.max(REVIEW_CONFIG.MAX_RATING, `La note maximum est ${REVIEW_CONFIG.MAX_RATING}`),

	title: z
		.string()
		.max(
			REVIEW_CONFIG.MAX_TITLE_LENGTH,
			`Le titre ne doit pas dépasser ${REVIEW_CONFIG.MAX_TITLE_LENGTH} caractères`,
		)
		.trim()
		.optional()
		.transform((val) => (val === "" || val === undefined ? null : val)),

	content: z
		.string()
		.min(
			REVIEW_CONFIG.MIN_CONTENT_LENGTH,
			`L'avis doit contenir au moins ${REVIEW_CONFIG.MIN_CONTENT_LENGTH} caractères`,
		)
		.max(
			REVIEW_CONFIG.MAX_CONTENT_LENGTH,
			`L'avis ne doit pas dépasser ${REVIEW_CONFIG.MAX_CONTENT_LENGTH} caractères`,
		)
		.trim(),

	media: z
		.array(reviewMediaSchema)
		.max(REVIEW_CONFIG.MAX_MEDIA_COUNT, `Maximum ${REVIEW_CONFIG.MAX_MEDIA_COUNT} photos`)
		.default([]),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

// ============================================================================
// DELETE REVIEW SCHEMA
// ============================================================================

/**
 * Schéma de validation pour la suppression d'un avis
 */
export const deleteReviewSchema = z.object({
	id: z.cuid2("ID d'avis invalide"),
});

export type DeleteReviewInput = z.infer<typeof deleteReviewSchema>;

// ============================================================================
// MODERATION SCHEMAS (Admin)
// ============================================================================

/**
 * Schéma pour masquer/afficher un avis
 */
export const moderateReviewSchema = z.object({
	id: z.cuid2("ID d'avis invalide"),
});

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

/**
 * Schéma pour masquer plusieurs avis en masse
 */
export const bulkHideReviewsSchema = z.object({
	ids: z
		.array(z.cuid2("ID d'avis invalide"))
		.min(1, "Sélectionnez au moins un avis")
		.max(100, "Maximum 100 avis par opération"),
});

export type BulkHideReviewsInput = z.infer<typeof bulkHideReviewsSchema>;

/**
 * Schéma pour publier plusieurs avis en masse
 */
export const bulkPublishReviewsSchema = z.object({
	ids: z
		.array(z.cuid2("ID d'avis invalide"))
		.min(1, "Sélectionnez au moins un avis")
		.max(100, "Maximum 100 avis par opération"),
});

export type BulkPublishReviewsInput = z.infer<typeof bulkPublishReviewsSchema>;

/**
 * Schéma pour supprimer plusieurs avis en masse (soft delete admin)
 */
export const bulkDeleteReviewsSchema = z.object({
	ids: z
		.array(z.cuid2("ID d'avis invalide"))
		.min(1, "Sélectionnez au moins un avis")
		.max(100, "Maximum 100 avis par opération"),
});

export type BulkDeleteReviewsInput = z.infer<typeof bulkDeleteReviewsSchema>;

// ============================================================================
// REVIEW RESPONSE SCHEMAS (Admin)
// ============================================================================

/**
 * Schéma de validation pour la création d'une réponse admin
 */
export const createReviewResponseSchema = z.object({
	reviewId: z.cuid2("ID d'avis invalide"),

	content: z
		.string()
		.min(
			REVIEW_CONFIG.MIN_CONTENT_LENGTH,
			`La réponse doit contenir au moins ${REVIEW_CONFIG.MIN_CONTENT_LENGTH} caractères`,
		)
		.max(
			REVIEW_CONFIG.MAX_RESPONSE_LENGTH,
			`La réponse ne doit pas dépasser ${REVIEW_CONFIG.MAX_RESPONSE_LENGTH} caractères`,
		)
		.trim(),
});

export type CreateReviewResponseInput = z.infer<typeof createReviewResponseSchema>;

/**
 * Schéma de validation pour la modification d'une réponse admin
 */
export const updateReviewResponseSchema = z.object({
	id: z.cuid2("ID de réponse invalide"),

	content: z
		.string()
		.min(
			REVIEW_CONFIG.MIN_CONTENT_LENGTH,
			`La réponse doit contenir au moins ${REVIEW_CONFIG.MIN_CONTENT_LENGTH} caractères`,
		)
		.max(
			REVIEW_CONFIG.MAX_RESPONSE_LENGTH,
			`La réponse ne doit pas dépasser ${REVIEW_CONFIG.MAX_RESPONSE_LENGTH} caractères`,
		)
		.trim(),
});

export type UpdateReviewResponseInput = z.infer<typeof updateReviewResponseSchema>;

/**
 * Schéma de validation pour la suppression d'une réponse admin
 */
export const deleteReviewResponseSchema = z.object({
	id: z.cuid2("ID de réponse invalide"),
});

export type DeleteReviewResponseInput = z.infer<typeof deleteReviewResponseSchema>;

/**
 * Schema de validation pour l'envoi d'email de demande d'avis
 */
export const sendReviewRequestEmailSchema = z.object({
	orderId: z.cuid2("ID de commande invalide"),
});

export type SendReviewRequestEmailInput = z.infer<typeof sendReviewRequestEmailSchema>;

// ============================================================================
// STOREFRONT PARAMS SCHEMA
// ============================================================================

/**
 * Schéma de validation pour les paramètres de requête storefront
 */
export const getProductReviewsSchema = z.object({
	productId: z.cuid2("ID de produit invalide"),
	cursor: z.cuid2().optional(),
	perPage: z.coerce
		.number()
		.min(1)
		.max(REVIEW_CONFIG.MAX_PER_PAGE)
		.default(REVIEW_CONFIG.DEFAULT_PER_PAGE),
	sortBy: z.enum(["recent", "oldest", "highest-rating", "lowest-rating"]).default("recent"),
	filterRating: z.coerce.number().int().min(1).max(5).optional(),
});

export type GetProductReviewsInput = z.infer<typeof getProductReviewsSchema>;
