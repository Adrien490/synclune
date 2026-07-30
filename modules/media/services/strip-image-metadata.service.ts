/**
 * RGPD: strip EXIF/GPS metadata from an uploaded image.
 *
 * UploadThing v7 architecture stocke directement le fichier client sur le CDN
 * sans passer par Synclune. Cela signifie que les métadonnées EXIF (notamment
 * GPS pour les photos iPhone < 1 MB qui contournent la compression Canvas
 * cliente) atterrissent telles quelles sur une URL publique.
 *
 * Ce service re-encode le buffer via Sharp (qui strip par défaut toutes les
 * métadonnées si `withMetadata()` n'est pas appelé), puis remplace le fichier
 * d'origine en uploadant la version nettoyée et en supprimant l'ancien blob.
 *
 * Le résultat est un statut EXPLICITE à trois branches (audit média M4) : un
 * simple `null` confondait « rien à stripper » et « strip échoué », ce qui
 * interdisait à l'appelant de bloquer la publication d'une photo encore
 * porteuse de coordonnées GPS.
 *
 * LAYER EXCEPTION: ce service contient des I/O (UTApi upload/delete).
 * Documenté dans `01-conventions.md § Services transactionnels partagés` car
 * appelé depuis le route handler UploadThing (catalogMedia
 * `onUploadComplete`).
 *
 * @module modules/media/services/strip-image-metadata.service
 */

import sharp from "sharp";
import * as Sentry from "@sentry/nextjs";
import { utapi } from "@/shared/lib/uploadthing";

export interface StripImageMetadataInput {
	/** UploadThing key of the original blob (used for delete-after-replace) */
	key: string;
	/** Original filename, preserved on re-upload */
	name: string;
	/** Original MIME type, preserved on re-upload */
	type: string;
}

export type StripImageMetadataResult =
	/** Métadonnées retirées : le blob d'origine a été remplacé. */
	| { status: "stripped"; url: string; key: string; buffer: Buffer }
	/** Aucune métadonnée à retirer : le blob d'origine est déjà propre. */
	| { status: "unchanged" }
	/** Le strip a échoué : le blob d'origine porte peut-être encore de l'EXIF. */
	| { status: "failed"; reason: unknown };

/**
 * Re-encode an image buffer to strip EXIF/GPS metadata, then replace the
 * UploadThing blob in-place (upload cleaned + delete original).
 *
 * `animated: true` : sans lui, libvips ne lit que la première page et un GIF /
 * WebP animé serait ré-uploadé aplati en une seule image, l'original animé
 * supprimé (audit média M5 — perte irréversible).
 *
 * Format preservation: Sharp `.toBuffer()` without explicit format conversion
 * keeps the input encoding (JPEG → JPEG, PNG → PNG, etc.). `rotate()` applies
 * EXIF orientation before strip so portrait/landscape stays correct — il est
 * volontairement omis sur les images multi-pages (libvips ne sait pas pivoter
 * une séquence animée).
 */
export async function stripImageMetadata(
	buffer: Buffer,
	file: StripImageMetadataInput,
): Promise<StripImageMetadataResult> {
	try {
		const image = sharp(buffer, { animated: true });
		const { pages } = await image.metadata();
		const cleaned = await (pages && pages > 1 ? image : image.rotate()).toBuffer();

		// Si le strip n'a rien changé (pas d'EXIF à l'origine) on évite un re-upload inutile.
		if (cleaned.length === buffer.length && cleaned.equals(buffer)) {
			return { status: "unchanged" };
		}

		const cleanedFile = new File([new Uint8Array(cleaned)], file.name, { type: file.type });
		const response = await utapi.uploadFiles([cleanedFile]);
		const uploaded = response[0]?.data;

		if (!uploaded?.ufsUrl || !uploaded.key) {
			Sentry.captureMessage("strip-image-metadata: re-upload returned no URL", {
				level: "warning",
				tags: { service: "strip-image-metadata", originalKey: file.key },
			});
			return { status: "failed", reason: new Error("re-upload returned no URL") };
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

		return { status: "stripped", url: uploaded.ufsUrl, key: uploaded.key, buffer: cleaned };
	} catch (err) {
		Sentry.captureException(err, {
			tags: { service: "strip-image-metadata", originalKey: file.key },
		});
		return { status: "failed", reason: err };
	}
}
