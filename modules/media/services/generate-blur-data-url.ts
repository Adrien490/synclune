/**
 * Service de generation de blur placeholders pour les images
 *
 * Genere des base64 blur placeholders (10x10) pour un chargement progressif
 * des images. Utilise plaiceholder pour le traitement.
 *
 * @module modules/media/services/generate-blur-data-url
 */

import { getPlaiceholder } from "plaiceholder";
import { BLUR_PLACEHOLDER_CONFIG } from "../constants/media.constants";
import { isValidUploadThingUrl } from "../utils/validate-media-file";
import {
	downloadImage,
	truncateUrl,
	withRetry,
	type LogFn,
} from "./image-downloader.service";

// ============================================================================
// TYPES
// ============================================================================

/** Fonction de log pour les avertissements */
export type BlurLogFn = LogFn;

export interface GenerateBlurOptions {
	/** Timeout pour le telechargement (ms) */
	downloadTimeout?: number;
	/** Taille max de l'image (octets) */
	maxImageSize?: number;
	/** Taille du placeholder (pixels) */
	plaiceholderSize?: number;
	/** Valider que l'URL est un domaine UploadThing */
	validateDomain?: boolean;
	/** Fonction de log personnalisée (defaut: console.warn) */
	logWarning?: BlurLogFn;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Valide qu'un blur data URL est au format attendu
 */
function isValidBlurDataUrl(base64: string): boolean {
	return base64.startsWith("data:image/");
}

/**
 * Logger par defaut (console.warn)
 */
const defaultLogger: BlurLogFn = (message) => console.warn(message);

/**
 * Genere un blurDataURL (base64) pour une image
 *
 * @param imageUrl - URL de l'image source
 * @param options - Options de generation
 * @returns Base64 blur placeholder ou undefined si echec
 *
 * @example
 * ```ts
 * const blur = await generateBlurDataUrl("https://utfs.io/f/abc123.jpg");
 * // => "data:image/jpeg;base64,/9j/4AAQ..."
 * ```
 */
export async function generateBlurDataUrl(
	imageUrl: string,
	options: GenerateBlurOptions = {}
): Promise<string | undefined> {
	const validateDomain = options.validateDomain ?? true;
	const plaiceholderSize = options.plaiceholderSize ?? BLUR_PLACEHOLDER_CONFIG.plaiceholderSize;
	const log = options.logWarning ?? defaultLogger;

	// Validation du domaine source (protection SSRF)
	if (validateDomain && !isValidUploadThingUrl(imageUrl)) {
		log("[BlurDataUrl] Domaine non autorise", { url: truncateUrl(imageUrl) });
		return undefined;
	}

	try {
		const buffer = await downloadImage(imageUrl, {
			downloadTimeout: options.downloadTimeout ?? BLUR_PLACEHOLDER_CONFIG.downloadTimeout,
			maxImageSize: options.maxImageSize ?? BLUR_PLACEHOLDER_CONFIG.maxImageSize,
			userAgent: "Synclune-BlurGenerator/1.0",
		});
		const { base64 } = await getPlaiceholder(buffer, { size: plaiceholderSize });

		// Validation du résultat
		if (!isValidBlurDataUrl(base64)) {
			log("[BlurDataUrl] Format invalide genere", { expected: "data:image/..." });
			return undefined;
		}

		return base64;
	} catch (error) {
		const timeout = options.downloadTimeout ?? BLUR_PLACEHOLDER_CONFIG.downloadTimeout;
		if (error instanceof Error && error.name === "AbortError") {
			log("[BlurDataUrl] Timeout", { timeoutMs: timeout, url: truncateUrl(imageUrl) });
		} else {
			log("[BlurDataUrl] Generation echouee", {
				error: error instanceof Error ? error.message : String(error),
				url: truncateUrl(imageUrl),
			});
		}
		return undefined;
	}
}

/**
 * Genere un blurDataURL avec retry automatique
 *
 * @param imageUrl - URL de l'image source
 * @param options - Options de generation
 * @returns Base64 blur placeholder
 * @throws {Error} Si toutes les tentatives echouent
 *
 * @example
 * ```ts
 * const blur = await generateBlurDataUrlWithRetry("https://utfs.io/f/abc123.jpg");
 * ```
 */
export async function generateBlurDataUrlWithRetry(
	imageUrl: string,
	options: GenerateBlurOptions = {}
): Promise<string> {
	const validateDomain = options.validateDomain ?? true;
	const plaiceholderSize = options.plaiceholderSize ?? BLUR_PLACEHOLDER_CONFIG.plaiceholderSize;

	// Validation du domaine source (protection SSRF)
	if (validateDomain && !isValidUploadThingUrl(imageUrl)) {
		throw new Error(`Domaine non autorise: ${new URL(imageUrl).hostname}`);
	}

	return withRetry(
		async () => {
			const buffer = await downloadImage(imageUrl, {
				downloadTimeout: options.downloadTimeout ?? BLUR_PLACEHOLDER_CONFIG.downloadTimeout,
				maxImageSize: options.maxImageSize ?? BLUR_PLACEHOLDER_CONFIG.maxImageSize,
				userAgent: "Synclune-BlurGenerator/1.0",
			});
			const { base64 } = await getPlaiceholder(buffer, { size: plaiceholderSize });

			// Validation du résultat
			if (!isValidBlurDataUrl(base64)) {
				throw new Error("Format de blur invalide généré (attendu: data:image/...)");
			}

			return base64;
		},
		{
			maxRetries: BLUR_PLACEHOLDER_CONFIG.maxRetries,
			baseDelay: BLUR_PLACEHOLDER_CONFIG.retryBaseDelay,
		}
	);
}

/**
 * Genere un blurDataURL depuis un buffer (pas de telechargement)
 *
 * @param buffer - Buffer de l'image
 * @param options - Options de generation
 * @returns Base64 blur placeholder
 */
export async function generateBlurDataUrlFromBuffer(
	buffer: Buffer,
	options: Pick<GenerateBlurOptions, "plaiceholderSize" | "maxImageSize"> = {}
): Promise<string> {
	const maxSize = options.maxImageSize ?? BLUR_PLACEHOLDER_CONFIG.maxImageSize;
	const plaiceholderSize = options.plaiceholderSize ?? BLUR_PLACEHOLDER_CONFIG.plaiceholderSize;

	if (buffer.length > maxSize) {
		throw new Error(
			`Image trop volumineuse: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(0)}MB)`
		);
	}

	const { base64 } = await getPlaiceholder(buffer, { size: plaiceholderSize });

	// Validation du résultat
	if (!isValidBlurDataUrl(base64)) {
		throw new Error("Format de blur invalide généré (attendu: data:image/...)");
	}

	return base64;
}
