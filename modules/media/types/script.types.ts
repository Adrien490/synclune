/**
 * Shared types for media migration scripts
 *
 * Used by:
 * - scripts/generate-blur-placeholders.ts
 * - scripts/generate-video-thumbnails.ts
 */

import type { Prisma } from "../../../app/generated/prisma/client";

/**
 * Media item to process (image or video).
 * Derived from the Prisma SkuMedia model to ensure schema consistency.
 */
export type MediaItem = Prisma.SkuMediaGetPayload<{
	select: {
		id: true;
		url: true;
		skuId: true;
	};
}>;

/**
 * Performance metrics for media processing
 */
export interface ProcessMetrics {
	/** Total processing duration (ms) */
	totalMs: number;
	/** Download duration (ms) */
	downloadMs: number;
	/** Validation duration (ms) */
	validationMs: number;
	/** Extraction/processing duration (ms) */
	extractionMs: number;
	/** Blur generation duration (ms) */
	blurMs: number;
	/** Upload duration (ms) */
	uploadMs: number;
	/** DB update duration (ms) */
	dbUpdateMs: number;
}

/**
 * Media processing result
 */
export interface ProcessResult {
	/** Processed media ID */
	id: string;
	/** Processing success */
	success: boolean;
	/** Error message if failed */
	error?: string;
	/** Performance metrics (optional) */
	metrics?: ProcessMetrics;
}

/**
 * Structured log for monitoring (Sentry-compatible)
 */
export interface StructuredLog {
	/** ISO 8601 timestamp */
	timestamp: string;
	/** Log level */
	level: "info" | "warn" | "error";
	/** Event name */
	event: string;
	/** Additional data */
	data?: Record<string, unknown>;
}
