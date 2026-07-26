/**
 * Service for generating ThumbHash image placeholders.
 *
 * ThumbHash is the 2025 standard for image placeholders:
 * - Ultra-compact (~25 bytes vs ~200-300 bytes for base64)
 * - Transparency support (alpha)
 * - Automatically encodes aspect ratio
 * - Better color fidelity than BlurHash/plaiceholder
 *
 * Buffer-first : le pipeline `onUploadComplete` télécharge l'image UNE fois et
 * fait circuler le buffer (audit média M6). Les anciennes variantes par URL
 * re-téléchargeaient l'image — jusqu'à 3 fois par upload avec les retries.
 *
 * @see https://evanw.github.io/thumbhash/
 * @module modules/media/services/generate-thumbhash
 */

import sharp from "sharp";
import { rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";
import { THUMBHASH_CONFIG } from "../constants/image-downloader.constants";
import type { ThumbHashResult } from "../types/image-processing.types";

// ============================================================================
// HELPERS
// ============================================================================

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
	maxSize: number,
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
 * Generates a ThumbHash from an already-downloaded image buffer.
 *
 * @param buffer - Image buffer
 * @param options - Generation options
 * @throws {Error} If the buffer exceeds the size cap or Sharp cannot decode it.
 *
 * @example
 * ```ts
 * const result = await generateThumbHashFromBuffer(buffer);
 * // => { hash: "YJqGPQ...", dataUrl: "data:image/png;base64,...", width: 100, height: 75 }
 * ```
 */
export async function generateThumbHashFromBuffer(
	buffer: Buffer,
	options: { maxSize?: number; maxImageSize?: number } = {},
): Promise<ThumbHashResult> {
	const maxSize = options.maxSize ?? THUMBHASH_CONFIG.maxSize;
	const maxImageSize = options.maxImageSize ?? THUMBHASH_CONFIG.maxImageSize;

	if (buffer.length > maxImageSize) {
		throw new Error(
			`Image trop volumineuse: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: ${(maxImageSize / 1024 / 1024).toFixed(0)}MB)`,
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
