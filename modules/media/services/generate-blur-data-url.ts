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

/** Fonction de log pour les avertissements */
export type BlurLogFn = (message: string, data?: Record<string, unknown>) => void;

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
 * Attendre un delai
 */
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Valide qu'un blur data URL est au format attendu
 */
function isValidBlurDataUrl(base64: string): boolean {
	return base64.startsWith("data:image/");
}

/**
 * Tronque une URL pour les logs (evite d'exposer trop d'info)
 */
function truncateUrl(url: string, maxLength: number = 50): string {
	if (url.length <= maxLength) return url;
	return url.substring(0, maxLength) + "...";
}

/**
 * Logger par defaut (console.warn)
 */
const defaultLogger: BlurLogFn = (message) => console.warn(message);

/**
 * Determine si une erreur est temporaire et merite un retry
 * - Erreurs 5xx (serveur) -> retry
 * - Timeout/AbortError -> retry
 * - Erreurs reseau -> retry
 * - Erreurs 4xx (client) -> pas de retry (erreur permanente)
 */
function isRetryableError(error: unknown): boolean {
	if (!(error instanceof Error)) return true; // Erreur inconnue, on retry

	const message = error.message.toLowerCase();

	// Timeout ou abort -> retry
	if (error.name === "AbortError" || message.includes("timeout")) {
		return true;
	}

	// Erreurs HTTP: extraire le code
	const httpMatch = message.match(/http\s*(\d{3})/i);
	if (httpMatch) {
		const statusCode = parseInt(httpMatch[1], 10);
		// 4xx = erreur client permanente (sauf 408 Request Timeout, 429 Too Many Requests)
		if (statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429) {
			return false;
		}
		// 5xx = erreur serveur temporaire
		return true;
	}

	// Erreurs reseau -> retry
	if (
		message.includes("network") ||
		message.includes("econnrefused") ||
		message.includes("econnreset") ||
		message.includes("etimedout")
	) {
		return true;
	}

	// Par defaut, on retry (prudence)
	return true;
}

/**
 * Executer une fonction avec retry et backoff exponentiel
 * Ne retry que les erreurs temporaires (5xx, timeout, reseau)
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

			// Verifier si l'erreur merite un retry
			if (!isRetryableError(error)) {
				throw lastError; // Erreur permanente, pas de retry
			}

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
	const log = options.logWarning ?? defaultLogger;

	// Validation du domaine source (protection SSRF)
	if (validateDomain && !isValidUploadThingUrl(imageUrl)) {
		log("[BlurDataUrl] Domaine non autorise", { url: truncateUrl(imageUrl) });
		return undefined;
	}

	try {
		const buffer = await downloadImage(imageUrl, options);
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

	return withRetry(async () => {
		const buffer = await downloadImage(imageUrl, options);
		const { base64 } = await getPlaiceholder(buffer, { size: plaiceholderSize });

		// Validation du résultat
		if (!isValidBlurDataUrl(base64)) {
			throw new Error("Format de blur invalide généré (attendu: data:image/...)");
		}

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

	// Validation du résultat
	if (!isValidBlurDataUrl(base64)) {
		throw new Error("Format de blur invalide généré (attendu: data:image/...)");
	}

	return base64;
}
