/**
 * Utilitaires pour la gestion des médias (images et vidéos)
 */

import type { MediaType } from "@/app/generated/prisma/client";

/**
 * Vérifie si un média est une vidéo en utilisant le champ mediaType de la base de données
 * C'est la méthode RECOMMANDÉE car elle est fiable même avec des URLs sans extension (ex: UploadThing)
 * @param mediaType - Le type de média depuis la base de données
 * @returns true si le média est une vidéo, false sinon
 */
export function isVideo(mediaType: MediaType): boolean {
	return mediaType === "VIDEO";
}

/**
 * Vérifie si un média est une image en utilisant le champ mediaType de la base de données
 * @param mediaType - Le type de média depuis la base de données
 * @returns true si le média est une image, false sinon
 */
export function isImage(mediaType: MediaType): boolean {
	return mediaType === "IMAGE";
}

/** Mapping des extensions video vers types MIME */
const VIDEO_MIME_TYPES: Record<string, string> = {
	webm: "video/webm",
	ogg: "video/ogg",
	ogv: "video/ogg",
	mov: "video/quicktime",
	avi: "video/x-msvideo",
	mkv: "video/x-matroska",
	mp4: "video/mp4",
};

/**
 * Obtient le type MIME d'une video a partir de son URL
 * Utilise une regex pour extraire l'extension en fin d'URL (avant query string)
 * @param url - L'URL de la video
 * @returns Le type MIME de la video
 */
export function getVideoMimeType(url: string): string {
	// Extraire l'extension de fichier (avant query params)
	const extensionMatch = url.toLowerCase().match(/\.(\w+)(?:\?|#|$)/);
	const extension = extensionMatch?.[1];

	// Warning si pas d'extension detectee (URLs CDN sans extension)
	if (!extension) {
		console.warn(
			`[Media] Impossible de detecter le type MIME pour l'URL: ${url.substring(0, 100)}... - fallback vers video/mp4`
		);
		return "video/mp4";
	}

	return VIDEO_MIME_TYPES[extension] || "video/mp4";
}

/**
 * Génère une liste de sources vidéo
 * Note: Ne génère pas de fallback WebM car les CDN (UploadThing, etc.)
 * ne créent pas automatiquement de versions alternatives
 * @param url - L'URL principale de la vidéo
 * @returns Array de sources avec types MIME
 */
export function getVideoSources(url: string): Array<{ src: string; type: string }> {
	return [{ src: url, type: getVideoMimeType(url) }];
}
