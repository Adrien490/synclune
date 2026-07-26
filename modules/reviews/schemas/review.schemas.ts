import { z } from "zod";
import { isAllowedMediaDomain } from "@/shared/lib/media-validation";
import { blurDataUrlSchema } from "@/shared/schemas/media.schema";
import { REVIEW_CONFIG } from "../constants/review.constants";

// ============================================================================
// MEDIA SCHEMA
// ============================================================================

/**
 * Schéma pour un média d'avis (photo)
 */
export const reviewMediaSchema = z.object({
	url: z.url("URL de média invalide").refine(isAllowedMediaDomain, {
		message: "L'URL du média doit provenir d'UploadThing",
	}),
	blurDataUrl: blurDataUrlSchema.optional(),
	altText: z.string().max(255, "Texte alternatif trop long").optional(),
});

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

// ============================================================================
// DELETE REVIEW SCHEMA
// ============================================================================

/**
 * Schéma de validation pour la suppression d'un avis
 */
export const deleteReviewSchema = z.object({
	id: z.cuid2("ID d'avis invalide"),
});

// ============================================================================
// MODERATION SCHEMAS (Admin)
// ============================================================================

/**
 * Schéma pour masquer/afficher un avis
 */
export const moderateReviewSchema = z.object({
	id: z.cuid2("ID d'avis invalide"),
});

/**
 * Schéma pour masquer/afficher en lot plusieurs avis
 */
export const bulkModerateReviewsSchema = z.object({
	reviewIds: z
		.array(z.cuid2("ID d'avis invalide"))
		.min(1, "Au moins un avis est requis")
		.max(100, "Maximum 100 avis par opération"),
	targetStatus: z.enum(["PUBLISHED", "HIDDEN"]),
});

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

/**
 * Schéma de validation pour la suppression d'une réponse admin
 */
export const deleteReviewResponseSchema = z.object({
	id: z.cuid2("ID de réponse invalide"),
});

// ============================================================================
// RESTORE SCHEMAS (Admin)
// ============================================================================

/**
 * Schema pour restaurer un avis soft-deleted (admin)
 */
export const restoreReviewSchema = z.object({
	id: z.cuid2("ID d'avis invalide"),
});
