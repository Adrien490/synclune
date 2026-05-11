/**
 * RGPD: strip EXIF/GPS metadata from an uploaded image.
 *
 * UploadThing v7 architecture stocke directement le fichier client sur le CDN
 * sans passer par Synclune. Cela signifie que les métadonnées EXIF (notamment
 * GPS pour les photos iPhone < 1 MB qui contournent la compression Canvas
 * cliente) atterrissent telles quelles sur une URL publique.
 *
 * Ce service télécharge le fichier depuis UploadThing, le re-encode via Sharp
 * (qui strip par défaut toutes les métadonnées si `withMetadata()` n'est pas
 * appelé), puis remplace le fichier d'origine en supprimant l'ancien blob et
 * en uploadant la version nettoyée.
 *
 * LAYER EXCEPTION: ce service contient des I/O (download + UTApi upload/delete).
 * Documenté dans `01-conventions.md § Services transactionnels partagés` car
 * appelé depuis le route handler UploadThing (catalogMedia + reviewMedia
 * `onUploadComplete`).
 *
 * @module modules/media/services/strip-image-metadata.service
 */

import sharp from "sharp";
import * as Sentry from "@sentry/nextjs";
import { downloadImage } from "./image-downloader.service";
import { utapi } from "@/shared/lib/uploadthing";
import { isValidUploadThingUrl } from "../utils/validate-media-file";
import { THUMBHASH_CONFIG } from "../constants/image-downloader.constants";

export interface StripImageMetadataInput {
	/** UploadThing URL of the freshly uploaded image */
	ufsUrl: string;
	/** UploadThing key of the original blob (used for delete-after-replace) */
	key: string;
	/** Original filename, preserved on re-upload */
	name: string;
	/** Original MIME type, preserved on re-upload */
	type: string;
}

export interface StripImageMetadataResult {
	/** New UploadThing URL after re-upload of the stripped buffer */
	url: string;
	/** New UploadThing key — replaces the original */
	key: string;
}

/**
 * Re-encode an image to strip EXIF/GPS metadata, then replace the UploadThing
 * blob in-place (upload cleaned + delete original).
 *
 * Best-effort: if any step fails (download, Sharp decode, re-upload), the
 * function returns `null` so the caller can fall back to the original URL.
 * Failures are captured in Sentry with the `strip-image-metadata` tag.
 *
 * Format preservation: Sharp `.toBuffer()` without explicit format conversion
 * keeps the input encoding (JPEG → JPEG, PNG → PNG, etc.). `rotate()` applies
 * EXIF orientation before strip so portrait/landscape stays correct.
 */
export async function stripImageMetadata(
	file: StripImageMetadataInput,
): Promise<StripImageMetadataResult | null> {
	if (!isValidUploadThingUrl(file.ufsUrl)) {
		return null;
	}

	try {
		const buffer = await downloadImage(file.ufsUrl, {
			downloadTimeout: THUMBHASH_CONFIG.downloadTimeout,
			maxImageSize: THUMBHASH_CONFIG.maxImageSize,
			userAgent: "Synclune-MetadataStrip/1.0",
		});

		// rotate() applique l'EXIF orientation pour préserver l'orientation visuelle ;
		// toBuffer() sans withMetadata() supprime tous les tags EXIF/GPS/XMP/ICC par défaut.
		const cleaned = await sharp(buffer).rotate().toBuffer();

		// Si le strip n'a rien changé (pas d'EXIF à l'origine) on évite un re-upload inutile.
		if (cleaned.length === buffer.length && cleaned.equals(buffer)) {
			return null;
		}

		const cleanedFile = new File([new Uint8Array(cleaned)], file.name, { type: file.type });
		const response = await utapi.uploadFiles([cleanedFile]);
		const uploaded = response[0]?.data;

		if (!uploaded?.ufsUrl || !uploaded.key) {
			Sentry.captureMessage("strip-image-metadata: re-upload returned no URL", {
				level: "warning",
				tags: { service: "strip-image-metadata", originalKey: file.key },
			});
			return null;
		}

		// Supprime l'original UNIQUEMENT après succès de l'upload (anti-perte de donnée).
		try {
			await utapi.deleteFiles([file.key]);
		} catch (deleteErr) {
			Sentry.captureException(deleteErr, {
				tags: {
					service: "strip-image-metadata",
					step: "delete-original",
					originalKey: file.key,
					newKey: uploaded.key,
				},
			});
			// Ne pas faire échouer le strip : le fichier sera ramassé par
			// `cleanup-orphan-media` (24h grace period).
		}

		return { url: uploaded.ufsUrl, key: uploaded.key };
	} catch (err) {
		Sentry.captureException(err, {
			tags: { service: "strip-image-metadata", originalKey: file.key },
		});
		return null;
	}
}
