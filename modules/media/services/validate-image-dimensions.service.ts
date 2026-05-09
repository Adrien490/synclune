/**
 * Image dimensions validation service.
 *
 * Defends against image-bomb DoS: a 50000×50000 px PNG is legal under the 16 MB
 * size limit but explodes to >2 GB of decoded pixel data. Reading only the
 * image header via Sharp metadata is cheap (no pixel decode) and lets us reject
 * abnormally large images before any downstream processing.
 *
 * @module modules/media/services/validate-image-dimensions.service
 */

import sharp from "sharp";
import { downloadImage } from "./image-downloader.service";
import { isValidUploadThingUrl } from "../utils/validate-media-file";
import { THUMBHASH_CONFIG } from "../constants/image-downloader.constants";

/**
 * Maximum allowed pixel count (width × height).
 * 50 MP covers 50 MP cameras + reasonable photo crops; rejects deliberate
 * image bombs (50000×50000 = 2.5 G pixels, ~10 GB decoded RGBA).
 */
export const MAX_IMAGE_PIXELS = 50_000_000;

export class ImageDimensionsTooLargeError extends Error {
	readonly width: number;
	readonly height: number;
	readonly maxPixels: number;

	constructor(width: number, height: number, maxPixels: number) {
		super(
			`Dimensions trop élevées: ${width}×${height}px (${(width * height) / 1_000_000}MP, max ${maxPixels / 1_000_000}MP)`,
		);
		this.name = "ImageDimensionsTooLargeError";
		this.width = width;
		this.height = height;
		this.maxPixels = maxPixels;
	}
}

/**
 * Reads the image header and verifies dimensions are within limits.
 *
 * @throws {ImageDimensionsTooLargeError} If width × height exceeds maxPixels.
 * @throws {Error} If the URL is not a trusted UploadThing domain or the image
 *   header cannot be parsed.
 */
export async function validateImageDimensions(
	imageUrl: string,
	maxPixels: number = MAX_IMAGE_PIXELS,
): Promise<{ width: number; height: number }> {
	if (!isValidUploadThingUrl(imageUrl)) {
		throw new Error(`Domaine non autorisé: ${new URL(imageUrl).hostname}`);
	}

	const buffer = await downloadImage(imageUrl, {
		downloadTimeout: THUMBHASH_CONFIG.downloadTimeout,
		maxImageSize: THUMBHASH_CONFIG.maxImageSize,
		userAgent: "Synclune-DimensionsCheck/1.0",
	});

	const { width, height } = await sharp(buffer).metadata();

	if (typeof width !== "number" || typeof height !== "number" || width === 0 || height === 0) {
		throw new Error("Impossible de lire les dimensions de l'image");
	}

	if (width * height > maxPixels) {
		throw new ImageDimensionsTooLargeError(width, height, maxPixels);
	}

	return { width, height };
}
