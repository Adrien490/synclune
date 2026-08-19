/**
 * Détection du type de média et du MIME vidéo depuis une URL.
 *
 * UN SEUL parseur d'extension (`getUrlExtension`) : trois régimes coexistaient
 * (`endsWith` aveugle aux query strings, regex sans fragment, regex complète)
 * pour la même question — deux ont été retirés avec leurs exports morts
 * (`isImageUrl`, `getFileExtension` : zéro appelant hors tests).
 *
 * ⚠️ Limite connue : les URLs UploadThing sont SANS extension — `detectMediaType`
 * n'est qu'un REPLI (les appelants passent `m.type ?? detectMediaType(url)`, et
 * le type vient normalement du formulaire) ; sur une URL extensionless il
 * retombe sur IMAGE.
 */

import { VIDEO_EXTENSIONS } from "../constants/media-limits.constants";
import type { MediaType } from "@/app/generated/prisma/client";

/**
 * Extension en minuscules (sans le point), robuste aux query strings ET aux
 * fragments (`video.mp4?v=1#t=2` → `mp4`), ou `null`.
 */
function getUrlExtension(url: string): string | null {
	const match = url.toLowerCase().match(/\.(\w+)(?:\?|#|$)/);
	return match?.[1] ?? null;
}

/**
 * Checks if a URL points to a video based on its extension
 */
export function isVideoUrl(url: string): boolean {
	const extension = getUrlExtension(url);
	return extension !== null && (VIDEO_EXTENSIONS as readonly string[]).includes(`.${extension}`);
}

/**
 * Detects the media type (IMAGE or VIDEO) based on the URL
 */
export function detectMediaType(url: string): MediaType {
	return isVideoUrl(url) ? "VIDEO" : "IMAGE";
}

/** Video extension to MIME type mapping */
const VIDEO_MIME_TYPES: Record<string, string> = {
	mp4: "video/mp4",
};

/**
 * Gets the MIME type of a video from its URL.
 * CDN URLs without extension (e.g. UploadThing) fall back to mp4 — le seul
 * format vidéo accepté à l'upload.
 */
export function getVideoMimeType(url: string): string {
	const extension = getUrlExtension(url);
	if (!extension) {
		return "video/mp4";
	}
	return VIDEO_MIME_TYPES[extension] ?? "video/mp4";
}
