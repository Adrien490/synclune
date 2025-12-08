/**
 * Types partagés pour les scripts de migration media
 *
 * Ces types sont utilisés par:
 * - scripts/generate-blur-placeholders.ts
 * - scripts/generate-video-thumbnails.ts
 */

import type { Prisma } from "../../../app/generated/prisma/client";

/**
 * Media item à traiter (image ou vidéo)
 * Dérivé du modèle Prisma SkuMedia pour garantir la cohérence avec le schéma
 */
export type MediaItem = Prisma.SkuMediaGetPayload<{
	select: {
		id: true;
		url: true;
		skuId: true;
	};
}>;

/**
 * Métriques de performance pour le traitement d'un media
 */
export interface ProcessMetrics {
	/** Durée totale du traitement (ms) */
	totalMs: number;
	/** Durée du téléchargement (ms) */
	downloadMs: number;
	/** Durée de la validation (ms) */
	validationMs: number;
	/** Durée de l'extraction/traitement (ms) */
	extractionMs: number;
	/** Durée de génération blur (ms) */
	blurMs: number;
	/** Durée de l'upload (ms) */
	uploadMs: number;
	/** Durée de la mise à jour DB (ms) */
	dbUpdateMs: number;
}

/**
 * Résultat du traitement d'un media
 */
export interface ProcessResult {
	/** ID du media traité */
	id: string;
	/** Succès du traitement */
	success: boolean;
	/** Message d'erreur si échec */
	error?: string;
	/** Métriques de performance (optionnel) */
	metrics?: ProcessMetrics;
}

/**
 * Log structuré pour monitoring (Sentry-compatible)
 */
export interface StructuredLog {
	/** Timestamp ISO 8601 */
	timestamp: string;
	/** Niveau de log */
	level: "info" | "warn" | "error";
	/** Nom de l'événement */
	event: string;
	/** Données additionnelles */
	data?: Record<string, unknown>;
}
