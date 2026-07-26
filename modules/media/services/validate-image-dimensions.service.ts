/**
 * Image dimensions validation service.
 *
 * Defends against image-bomb DoS: a 50000×50000 px PNG is legal under the 16 MB
 * size limit but explodes to >2 GB of decoded pixel data. Reading only the
 * image header via Sharp metadata is cheap (no pixel decode) and lets us reject
 * abnormally large images before any downstream processing.
 *
 * Buffer-first : l'appelant télécharge UNE fois (`downloadImage`) et fait
 * circuler le buffer dans tout le pipeline `onUploadComplete` (audit média
 * M6 — l'ancienne API par URL re-téléchargeait l'image à chaque étape).
 *
 * @module modules/media/services/validate-image-dimensions.service
 */

import sharp from "sharp";
import { ImageDecodeError } from "./image-downloader.service";

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
 * Reads the image header from a buffer and verifies dimensions are within limits.
 *
 * @throws {ImageDimensionsTooLargeError} If width × height exceeds maxPixels.
 * @throws {ImageDecodeError} If the header cannot be parsed (spoofed MIME,
 *   missing codec) — the caller MUST reject the upload.
 */
export async function assertImageDimensions(
	buffer: Buffer,
	maxPixels: number = MAX_IMAGE_PIXELS,
): Promise<{ width: number; height: number }> {
	let width: number | undefined;
	let height: number | undefined;

	try {
		({ width, height } = await sharp(buffer).metadata());
	} catch (err) {
		throw new ImageDecodeError(err);
	}

	if (typeof width !== "number" || typeof height !== "number" || width === 0 || height === 0) {
		throw new ImageDecodeError(new Error("Dimensions absentes de l'en-tête image"));
	}

	if (width * height > maxPixels) {
		throw new ImageDimensionsTooLargeError(width, height, maxPixels);
	}

	return { width, height };
}

/**
 * Lit les dimensions d'un buffer image sans jamais échouer.
 *
 * À appeler sur le buffer FINAL (post strip EXIF / re-encode HEIC) : `sharp.rotate()`
 * applique l'orientation EXIF et peut donc INTERVERTIR largeur et hauteur — les
 * dimensions du buffer d'origine ne décrivent pas toujours l'image publiée.
 *
 * Contrairement à `assertImageDimensions`, un échec est non fatal (retourne `null`) :
 * une dimension manquante dégrade le srcSet, elle ne doit pas perdre l'upload.
 */
export async function readImageDimensions(
	buffer: Buffer,
): Promise<{ width: number; height: number } | null> {
	try {
		const { width, height } = await sharp(buffer).metadata();
		if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) {
			return null;
		}
		return { width, height };
	} catch {
		return null;
	}
}
