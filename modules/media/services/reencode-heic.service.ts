/**
 * MEDIA-AUDIT-006: re-encode a raw HEIC/HEIF upload to WebP.
 *
 * Le client (`compress-image.ts`) convertit normalement le HEIC iPhone en
 * WebP/JPEG avant l'upload. Mais si cette conversion est contournée (échec
 * silencieux, upload programmatique), un fichier HEIC brut peut atterrir sur le
 * CDN public. Or HEIC n'est décodable QUE par Safari : Chrome / Firefox /
 * Android afficheraient une image cassée sur la vitrine.
 *
 * Ce service re-encode le buffer en WebP via Sharp (qui strip au passage tous
 * les EXIF/GPS — pas besoin de repasser par `stripImageMetadata`), uploade le
 * WebP et supprime l'original. En cas d'échec de décodage (build Sharp sans
 * codec libheif), il throw : l'appelant rejette alors l'upload et supprime le
 * blob HEIC orphelin — on ne persiste JAMAIS une URL HEIC publique.
 *
 * LAYER EXCEPTION: I/O (UTApi upload/delete), appelé depuis le route handler
 * UploadThing `onUploadComplete`. Même justification que
 * `strip-image-metadata.service.ts`.
 *
 * @module modules/media/services/reencode-heic.service
 */

import sharp from "sharp";
import { utapi } from "@/shared/lib/uploadthing";
import { ImageDecodeError } from "./image-downloader.service";

const HEIC_MIME_TYPES = ["image/heic", "image/heif"] as const;
const REENCODE_WEBP_QUALITY = 82;

export interface ReencodeHeicInput {
	/** UploadThing key of the original blob (deleted after successful re-upload) */
	key: string;
	/** Original filename — extension is rewritten to .webp */
	name: string;
}

export interface ReencodeHeicResult {
	/** New UploadThing URL of the WebP version */
	url: string;
	/** New UploadThing key — replaces the original HEIC */
	key: string;
	/** Re-encoded bytes, réutilisés en aval (ThumbHash) sans re-télécharger */
	buffer: Buffer;
}

/** True if the MIME type designates a HEIC/HEIF image. */
export function isHeicMimeType(type: string): boolean {
	return HEIC_MIME_TYPES.includes(type.toLowerCase() as (typeof HEIC_MIME_TYPES)[number]);
}

/**
 * Re-encode a HEIC/HEIF buffer to WebP and replace the UploadThing blob in-place.
 *
 * @throws {ImageDecodeError} si Sharp ne sait pas décoder le HEIC (build sans
 *   libheif) — l'appelant doit alors supprimer le blob et rejeter l'upload.
 * @throws {Error} si le re-upload échoue.
 */
export async function reencodeHeicToWebp(
	buffer: Buffer,
	file: ReencodeHeicInput,
): Promise<ReencodeHeicResult> {
	// rotate() applique l'orientation EXIF avant le strip ; webp() force la sortie
	// en WebP (web-safe, décodable par tous les navigateurs modernes).
	let webpBuffer: Buffer;
	try {
		webpBuffer = await sharp(buffer).rotate().webp({ quality: REENCODE_WEBP_QUALITY }).toBuffer();
	} catch (err) {
		throw new ImageDecodeError(err);
	}

	const webpName = file.name.replace(/\.(heic|heif)$/i, "") + ".webp";
	const webpFile = new File([new Uint8Array(webpBuffer)], webpName, { type: "image/webp" });
	const response = await utapi.uploadFiles([webpFile]);
	const uploaded = response[0]?.data;

	if (!uploaded?.ufsUrl || !uploaded.key) {
		throw new Error("reencodeHeicToWebp: re-upload returned no URL");
	}

	// Supprime l'original HEIC UNIQUEMENT après succès de l'upload WebP. Best-effort :
	// si le delete échoue, cleanup-orphan-media (24h grace) ramassera l'orphelin.
	try {
		await utapi.deleteFiles([file.key]);
	} catch {
		// non-bloquant
	}

	return { url: uploaded.ufsUrl, key: uploaded.key, buffer: webpBuffer };
}
