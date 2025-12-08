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

// ============================================================================
// TYPES
// ============================================================================

export interface BlurDataUrlResult {
	/** Base64 blur placeholder */
	base64: string;
}

export interface GenerateBlurOptions {
	/** Timeout pour le telechargement (ms) */
	downloadTimeout?: number;
	/** Taille max de l'image (octets) */
	maxImageSize?: number;
	/** Taille du placeholder (pixels) */
	plaiceholderSize?: number;
	/** Valider que l'URL est un domaine UploadThing */
	validateDomain?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Attendre un delai
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executer une fonction avec retry et backoff exponentiel
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	maxRetries: number = BLUR_PLACEHOLDER_CONFIG.maxRetries,
	baseDelay: number = BLUR_PLACEHOLDER_CONFIG.retryBaseDelay
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt < maxRetries - 1) {
				const waitTime = baseDelay * Math.pow(2, attempt);
				await delay(waitTime);
			}
		}
	}

	throw lastError;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Telecharge une image et retourne le buffer
 *
 * @param url - URL de l'image a telecharger
 * @param options - Options de telechargement
 * @throws {Error} Si le telechargement echoue ou timeout
 */
async function downloadImage(
	url: string,
	options: GenerateBlurOptions = {}
): Promise<Buffer> {
	const timeout = options.downloadTimeout ?? BLUR_PLACEHOLDER_CONFIG.downloadTimeout;
	const maxSize = options.maxImageSize ?? BLUR_PLACEHOLDER_CONFIG.maxImageSize;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				"User-Agent": "Synclune-BlurGenerator/1.0",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		// Verifier la taille avant telechargement complet
		const contentLength = response.headers.get("content-length");
		if (contentLength && parseInt(contentLength, 10) > maxSize) {
			throw new Error(
				`Image trop volumineuse: ${(parseInt(contentLength, 10) / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(0)}MB)`
			);
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Double verification apres telechargement
		if (buffer.length > maxSize) {
			throw new Error(
				`Image trop volumineuse: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(0)}MB)`
			);
		}

		return buffer;
	} finally {
		clearTimeout(timeoutId);
	}
}

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

	// Validation du domaine source (protection SSRF)
	if (validateDomain && !isValidUploadThingUrl(imageUrl)) {
		console.warn(
			`[BlurDataUrl] Domaine non autorise: ${new URL(imageUrl).hostname}`
		);
		return undefined;
	}

	try {
		const buffer = await downloadImage(imageUrl, options);
		const { base64 } = await getPlaiceholder(buffer, { size: plaiceholderSize });
		return base64;
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			console.warn(
				`[BlurDataUrl] Timeout apres ${options.downloadTimeout ?? BLUR_PLACEHOLDER_CONFIG.downloadTimeout}ms pour ${imageUrl}`
			);
		} else {
			console.warn("[BlurDataUrl] Generation echouee:", error);
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

	return withRetry(async () => {
		const buffer = await downloadImage(imageUrl, options);
		const { base64 } = await getPlaiceholder(buffer, { size: plaiceholderSize });
		return base64;
	});
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
	return base64;
}
