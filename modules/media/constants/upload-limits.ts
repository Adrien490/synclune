/**
 * Configuration centralisée des limites d'upload
 *
 * Ce fichier définit toutes les limites de rate limiting pour les uploads UploadThing.
 * Modifiez ces valeurs pour ajuster les limites sans toucher au code métier.
 *
 * 🎯 PHILOSOPHIE DES LIMITES :
 * - Admin: Limites plus permissives (actions légitimes et contrôlées)
 * - Utilisateurs connectés: Limites modérées
 * - Visiteurs: Limites strictes (risque d'abus)
 */

import type { RateLimitConfig } from "@/shared/lib/rate-limit";

/**
 * Convertit des minutes en millisecondes
 */
const minutes = (n: number) => n * 60 * 1000;

// ========================================
// 📸 UPLOADS ADMIN
// ========================================

/**
 * Limite pour les photos de témoignages (admin uniquement)
 *
 * Contexte : Photos d'auteurs de témoignages
 * Limite modérée car admin = utilisateur de confiance
 */
export const UPLOAD_TESTIMONIAL_LIMIT: RateLimitConfig = {
	limit: 5, // 5 uploads maximum
	windowMs: minutes(1), // par minute
};

/**
 * Limite pour les médias du catalogue (admin uniquement)
 *
 * Contexte : Images et vidéos de produits/SKUs
 * Plus permissif car workflow admin fréquent (ajout de produits)
 */
export const UPLOAD_CATALOG_LIMIT: RateLimitConfig = {
	limit: 10, // 10 uploads maximum
	windowMs: minutes(1), // par minute
};

// ========================================
// 📧 UPLOADS PUBLICS
// ========================================

/**
 * Limite pour les pièces jointes du formulaire de contact
 *
 * TRÈS STRICT : Endpoint public, risque d'abus élevé
 * Protège contre :
 * - Spam de fichiers
 * - Saturation du stockage
 * - Utilisation malveillante
 */
export const UPLOAD_CONTACT_ATTACHMENT_LIMIT: RateLimitConfig = {
	limit: 3, // 3 uploads maximum
	windowMs: minutes(10), // par 10 minutes
};

// ========================================
// ⭐ UPLOADS UTILISATEURS
// ========================================

/**
 * Limite pour les photos d'avis (utilisateurs connectés)
 *
 * Contexte : Photos accompagnant les avis produits
 * Modéré car utilisateurs authentifiés
 */
export const UPLOAD_REVIEW_MEDIA_LIMIT: RateLimitConfig = {
	limit: 5, // 5 uploads maximum
	windowMs: minutes(1), // par minute
};

// ========================================
// 📊 EXPORT GROUPÉ
// ========================================

/**
 * Toutes les limites d'upload groupées par contexte
 */
export const UPLOAD_LIMITS = {
	// Admin
	TESTIMONIAL: UPLOAD_TESTIMONIAL_LIMIT,
	CATALOG: UPLOAD_CATALOG_LIMIT,
	// Public
	CONTACT_ATTACHMENT: UPLOAD_CONTACT_ATTACHMENT_LIMIT,
	// Utilisateurs
	REVIEW_MEDIA: UPLOAD_REVIEW_MEDIA_LIMIT,
} as const;
