/**
 * Service de generation de ThumbHash placeholders pour les images
 *
 * ThumbHash est le standard 2025 pour les placeholders d'images:
 * - Ultra-compact (~25 bytes vs ~200-300 bytes pour base64)
 * - Support de la transparence (alpha)
 * - Encode l'aspect ratio automatiquement
 * - Meilleure fidelite des couleurs que BlurHash/plaiceholder
 *
 * @see https://evanw.github.io/thumbhash/
 * @module modules/media/services/generate-thumbhash
 */

import sharp from "sharp";
import { rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";
import { THUMBHASH_CONFIG } from "../constants/media.constants";
import type {
	GenerateThumbHashOptions,
	ThumbHashLogFn,
	ThumbHashResult,
} from "../types/image-processing.types";
import { isValidUploadThingUrl } from "../utils/validate-media-file";
import { downloadImage, truncateUrl, withRetry } from "./image-downloader.service";

// Re-export types for backwards compatibility
export type { GenerateThumbHashOptions, ThumbHashLogFn, ThumbHashResult };

// ============================================================================
// HELPERS
// ============================================================================

const defaultLogger: ThumbHashLogFn = (message) => console.warn(message);

/**
 * Valide qu'un data URL ThumbHash est au format attendu
 */
function isValidThumbHashDataUrl(dataUrl: string): boolean {
	return dataUrl.startsWith("data:image/png;base64,");
}

/**
 * Extrait les donnees RGBA d'un buffer image avec Sharp
 * Resize a max 100x100 (contrainte ThumbHash)
 */
async function extractRgbaData(
	buffer: Buffer,
	maxSize: number
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
	const image = sharp(buffer).ensureAlpha();

	// Resize en gardant l'aspect ratio, max 100x100
	const resized = image.resize(maxSize, maxSize, {
		fit: "inside",
		withoutEnlargement: true,
	});

	const { data, info } = await resized.raw().toBuffer({ resolveWithObject: true });

	return {
		rgba: new Uint8Array(data),
		width: info.width,
		height: info.height,
	};
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Genere un ThumbHash pour une image
 *
 * @param imageUrl - URL de l'image source
 * @param options - Options de generation
 * @returns ThumbHash result ou undefined si echec
 *
 * @example
 * ```ts
 * const result = await generateThumbHash("https://utfs.io/f/abc123.jpg");
 * // => { hash: "YJqGPQ...", dataUrl: "data:image/png;base64,...", width: 100, height: 75 }
 * ```
 */
export async function generateThumbHash(
	imageUrl: string,
	options: GenerateThumbHashOptions = {}
): Promise<ThumbHashResult | undefined> {
	const validateDomain = options.validateDomain ?? true;
	const maxSize = options.maxSize ?? THUMBHASH_CONFIG.maxSize;
	const log = options.logWarning ?? defaultLogger;

	// Validation du domaine source (protection SSRF)
	if (validateDomain && !isValidUploadThingUrl(imageUrl)) {
		log("[ThumbHash] Domaine non autorise", { url: truncateUrl(imageUrl) });
		return undefined;
	}

	try {
		const buffer = await downloadImage(imageUrl, {
			downloadTimeout: options.downloadTimeout ?? THUMBHASH_CONFIG.downloadTimeout,
			maxImageSize: options.maxImageSize ?? THUMBHASH_CONFIG.maxImageSize,
			userAgent: "Synclune-ThumbHash/1.0",
		});

		const { rgba, width, height } = await extractRgbaData(buffer, maxSize);

		// Generer le ThumbHash
		const hashBytes = rgbaToThumbHash(width, height, rgba);
		const hash = Buffer.from(hashBytes).toString("base64");
		const dataUrl = thumbHashToDataURL(hashBytes);

		// Validation du resultat
		if (!isValidThumbHashDataUrl(dataUrl)) {
			log("[ThumbHash] Format invalide genere", { expected: "data:image/png;base64,..." });
			return undefined;
		}

		return { hash, dataUrl, width, height };
	} catch (error) {
		const timeout = options.downloadTimeout ?? THUMBHASH_CONFIG.downloadTimeout;
		if (error instanceof Error && error.name === "AbortError") {
			log("[ThumbHash] Timeout", { timeoutMs: timeout, url: truncateUrl(imageUrl) });
		} else {
			log("[ThumbHash] Generation echouee", {
				error: error instanceof Error ? error.message : String(error),
				url: truncateUrl(imageUrl),
			});
		}
		return undefined;
	}
}

/**
 * Genere un ThumbHash avec retry automatique
 *
 * @param imageUrl - URL de l'image source
 * @param options - Options de generation
 * @returns ThumbHash result
 * @throws {Error} Si toutes les tentatives echouent
 */
export async function generateThumbHashWithRetry(
	imageUrl: string,
	options: GenerateThumbHashOptions = {}
): Promise<ThumbHashResult> {
	const validateDomain = options.validateDomain ?? true;
	const maxSize = options.maxSize ?? THUMBHASH_CONFIG.maxSize;

	// Validation du domaine source (protection SSRF)
	if (validateDomain && !isValidUploadThingUrl(imageUrl)) {
		throw new Error(`Domaine non autorise: ${new URL(imageUrl).hostname}`);
	}

	return withRetry(
		async () => {
			const buffer = await downloadImage(imageUrl, {
				downloadTimeout: options.downloadTimeout ?? THUMBHASH_CONFIG.downloadTimeout,
				maxImageSize: options.maxImageSize ?? THUMBHASH_CONFIG.maxImageSize,
				userAgent: "Synclune-ThumbHash/1.0",
			});

			const { rgba, width, height } = await extractRgbaData(buffer, maxSize);

			// Generer le ThumbHash
			const hashBytes = rgbaToThumbHash(width, height, rgba);
			const hash = Buffer.from(hashBytes).toString("base64");
			const dataUrl = thumbHashToDataURL(hashBytes);

			// Validation du resultat
			if (!isValidThumbHashDataUrl(dataUrl)) {
				throw new Error("Format de ThumbHash invalide genere (attendu: data:image/png;base64,...)");
			}

			return { hash, dataUrl, width, height };
		},
		{
			maxRetries: THUMBHASH_CONFIG.maxRetries,
			baseDelay: THUMBHASH_CONFIG.retryBaseDelay,
		}
	);
}

/**
 * Genere un ThumbHash depuis un buffer (pas de telechargement)
 *
 * @param buffer - Buffer de l'image
 * @param options - Options de generation
 * @returns ThumbHash result
 */
export async function generateThumbHashFromBuffer(
	buffer: Buffer,
	options: Pick<GenerateThumbHashOptions, "maxSize" | "maxImageSize"> = {}
): Promise<ThumbHashResult> {
	const maxSize = options.maxSize ?? THUMBHASH_CONFIG.maxSize;
	const maxImageSize = options.maxImageSize ?? THUMBHASH_CONFIG.maxImageSize;

	if (buffer.length > maxImageSize) {
		throw new Error(
			`Image trop volumineuse: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: ${(maxImageSize / 1024 / 1024).toFixed(0)}MB)`
		);
	}

	const { rgba, width, height } = await extractRgbaData(buffer, maxSize);

	// Generer le ThumbHash
	const hashBytes = rgbaToThumbHash(width, height, rgba);
	const hash = Buffer.from(hashBytes).toString("base64");
	const dataUrl = thumbHashToDataURL(hashBytes);

	// Validation du resultat
	if (!isValidThumbHashDataUrl(dataUrl)) {
		throw new Error("Format de ThumbHash invalide genere (attendu: data:image/png;base64,...)");
	}

	return { hash, dataUrl, width, height };
}

