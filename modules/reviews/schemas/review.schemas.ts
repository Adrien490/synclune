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
 * Schéma pour masquer plusieurs avis en masse
 */
export const bulkHideReviewsSchema = z.object({
	ids: z
		.array(z.cuid2("ID d'avis invalide"))
		.min(1, "Sélectionnez au moins un avis")
		.max(100, "Maximum 100 avis par opération"),
});

/**
 * Schéma pour publier plusieurs avis en masse
 */
export const bulkPublishReviewsSchema = z.object({
	ids: z
		.array(z.cuid2("ID d'avis invalide"))
		.min(1, "Sélectionnez au moins un avis")
		.max(100, "Maximum 100 avis par opération"),
});

/**
 * Schéma pour supprimer plusieurs avis en masse (soft delete admin)
 */
export const bulkDeleteReviewsSchema = z.object({
	ids: z
		.array(z.cuid2("ID d'avis invalide"))
		.min(1, "Sélectionnez au moins un avis")
		.max(100, "Maximum 100 avis par opération"),
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

/**
 * Schema de validation pour l'envoi d'email de demande d'avis
 */
export const sendReviewRequestEmailSchema = z.object({
	orderId: z.cuid2("ID de commande invalide"),
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

/**
 * Schema pour restaurer plusieurs avis soft-deleted en masse (admin)
 */
export const bulkRestoreReviewsSchema = z.object({
	ids: z
		.array(z.cuid2("ID d'avis invalide"))
		.min(1, "Sélectionnez au moins un avis")
		.max(100, "Maximum 100 avis par opération"),
});

// ============================================================================
// EXPORT SCHEMA (Admin)
// ============================================================================

export const EXPORT_REVIEWS_FORMATS = ["csv", "json"] as const;
export type ExportReviewsFormat = (typeof EXPORT_REVIEWS_FORMATS)[number];

export const EXPORT_REVIEWS_PERIODS = ["7d", "30d", "90d", "year", "all"] as const;
export type ExportReviewsPeriod = (typeof EXPORT_REVIEWS_PERIODS)[number];

/**
 * Schema pour l'export CSV/JSON des avis (admin)
 *
 * - `period` restreint la fenetre temporelle (createdAt)
 * - `format` choisit entre CSV (RFC 4180) et JSON
 * - `includeHidden` inclut les avis en statut HIDDEN (masques)
 * - `includeDeleted` inclut les avis soft-deleted (RGPD)
 */
export const exportReviewsSchema = z.object({
	period: z.enum(EXPORT_REVIEWS_PERIODS, { message: "Période invalide" }).default("30d"),
	format: z.enum(EXPORT_REVIEWS_FORMATS, { message: "Format invalide" }),
	includeHidden: z.coerce.boolean().default(false),
	includeDeleted: z.coerce.boolean().default(false),
});

export type ExportReviewsInput = z.infer<typeof exportReviewsSchema>;
