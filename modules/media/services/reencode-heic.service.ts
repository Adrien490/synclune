/**
 * MEDIA-AUDIT-006: re-encode a raw HEIC/HEIF upload to WebP.
 *
 * Le client (`compress-image.ts`) convertit normalement le HEIC iPhone en
 * WebP/JPEG avant l'upload. Mais si cette conversion est contournée (échec
 * silencieux, upload programmatique), un fichier HEIC brut peut atterrir sur le
 * CDN public. Or HEIC n'est décodable QUE par Safari : Chrome / Firefox /
 * Android afficheraient une image cassée sur la vitrine.
 *
 * Ce service télécharge le HEIC, le re-encode en WebP via Sharp (qui strip au
 * passage tous les EXIF/GPS — pas besoin de repasser par `stripImageMetadata`),
 * uploade le WebP et supprime l'original. En cas d'échec de décodage (build
 * Sharp sans codec libheif), il throw : l'appelant rejette alors l'upload et
 * supprime le blob HEIC orphelin — on ne persiste JAMAIS une URL HEIC publique.
 *
 * LAYER EXCEPTION: I/O (download + UTApi upload/delete), appelé depuis le route
 * handler UploadThing `onUploadComplete`. Même justification que
 * `strip-image-metadata.service.ts`.
 *
 * @module modules/media/services/reencode-heic.service
 */

import sharp from "sharp";
import { downloadImage } from "./image-downloader.service";
import { utapi } from "@/shared/lib/uploadthing";
import { isValidUploadThingUrl } from "../utils/validate-media-file";
import { THUMBHASH_CONFIG } from "../constants/image-downloader.constants";

const HEIC_MIME_TYPES = ["image/heic", "image/heif"] as const;
const REENCODE_WEBP_QUALITY = 82;

export interface ReencodeHeicInput {
	/** UploadThing URL of the freshly uploaded blob */
	ufsUrl: string;
	/** UploadThing key of the original blob (deleted after successful re-upload) */
	key: string;
	/** Original filename — extension is rewritten to .webp */
	name: string;
	/** Original MIME type */
	type: string;
}

export interface ReencodeHeicResult {
	/** New UploadThing URL of the WebP version */
	url: string;
	/** New UploadThing key — replaces the original HEIC */
	key: string;
}

/** True if the MIME type designates a HEIC/HEIF image. */
export function isHeicMimeType(type: string): boolean {
	return HEIC_MIME_TYPES.includes(type.toLowerCase() as (typeof HEIC_MIME_TYPES)[number]);
}

/**
 * Re-encode a HEIC/HEIF UploadThing blob to WebP in-place.
 *
 * @throws if download, Sharp decode (no libheif codec) or re-upload fails — the
 * caller must then delete the original HEIC blob and reject the upload.
 */
export async function reencodeHeicToWebp(file: ReencodeHeicInput): Promise<ReencodeHeicResult> {
	if (!isValidUploadThingUrl(file.ufsUrl)) {
		throw new Error(`reencodeHeicToWebp: domaine non autorisé pour ${file.ufsUrl}`);
	}

	const buffer = await downloadImage(file.ufsUrl, {
		downloadTimeout: THUMBHASH_CONFIG.downloadTimeout,
		maxImageSize: THUMBHASH_CONFIG.maxImageSize,
		userAgent: "Synclune-HeicReencode/1.0",
	});

	// rotate() applique l'orientation EXIF avant le strip ; webp() force la sortie
	// en WebP (web-safe, décodable par tous les navigateurs modernes).
	const webpBuffer = await sharp(buffer)
		.rotate()
		.webp({ quality: REENCODE_WEBP_QUALITY })
		.toBuffer();

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

	return { url: uploaded.ufsUrl, key: uploaded.key };
}
