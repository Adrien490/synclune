/**
 * Service for generating ThumbHash image placeholders.
 *
 * ThumbHash is the 2025 standard for image placeholders:
 * - Ultra-compact (~25 bytes vs ~200-300 bytes for base64)
 * - Transparency support (alpha)
 * - Automatically encodes aspect ratio
 * - Better color fidelity than BlurHash/plaiceholder
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
 * Validates that a ThumbHash data URL has the expected format
 */
function isValidThumbHashDataUrl(dataUrl: string): boolean {
	return dataUrl.startsWith("data:image/png;base64,");
}

/**
 * Extracts RGBA data from an image buffer using Sharp.
 * Resizes to max 100x100 (ThumbHash constraint).
 */
async function extractRgbaData(
	buffer: Buffer,
	maxSize: number
): Promise<{ rgba: Uint8Array; width: number; height: number }> {
	const image = sharp(buffer).ensureAlpha();

	// Resize maintaining aspect ratio, max 100x100
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
 * Generates a ThumbHash for an image.
 *
 * @param imageUrl - Source image URL
 * @param options - Generation options
 * @returns ThumbHash result or undefined on failure
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

	// Source domain validation (SSRF protection)
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

		// Generate the ThumbHash
		const hashBytes = rgbaToThumbHash(width, height, rgba);
		const hash = Buffer.from(hashBytes).toString("base64");
		const dataUrl = thumbHashToDataURL(hashBytes);

		// Validate the result
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
 * Generates a ThumbHash with automatic retry.
 *
 * @param imageUrl - Source image URL
 * @param options - Generation options
 * @returns ThumbHash result
 * @throws {Error} If all attempts fail
 */
export async function generateThumbHashWithRetry(
	imageUrl: string,
	options: GenerateThumbHashOptions = {}
): Promise<ThumbHashResult> {
	const validateDomain = options.validateDomain ?? true;
	const maxSize = options.maxSize ?? THUMBHASH_CONFIG.maxSize;

	// Source domain validation (SSRF protection)
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

			// Generate the ThumbHash
			const hashBytes = rgbaToThumbHash(width, height, rgba);
			const hash = Buffer.from(hashBytes).toString("base64");
			const dataUrl = thumbHashToDataURL(hashBytes);

			// Validate the result
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
 * Generates a ThumbHash from a buffer (no download needed).
 *
 * @param buffer - Image buffer
 * @param options - Generation options
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

	// Generate the ThumbHash
	const hashBytes = rgbaToThumbHash(width, height, rgba);
	const hash = Buffer.from(hashBytes).toString("base64");
	const dataUrl = thumbHashToDataURL(hashBytes);

	// Validate the result
	if (!isValidThumbHashDataUrl(dataUrl)) {
		throw new Error("Format de ThumbHash invalide genere (attendu: data:image/png;base64,...)");
	}

	return { hash, dataUrl, width, height };
}

