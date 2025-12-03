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

/**
 * Obtient le type MIME d'une vidéo à partir de son URL
 * Utilise une regex pour extraire l'extension en fin d'URL (avant query string)
 * @param url - L'URL de la vidéo
 * @returns Le type MIME de la vidéo
 */
export function getVideoMimeType(url: string): string {
	// Extraire l'extension de fichier (avant query params)
	const extensionMatch = url.toLowerCase().match(/\.(\w+)(?:\?|#|$)/);
	const extension = extensionMatch?.[1];

	switch (extension) {
		case "webm":
			return "video/webm";
		case "ogg":
		case "ogv":
			return "video/ogg";
		case "mov":
			return "video/quicktime";
		case "avi":
			return "video/x-msvideo";
		case "mkv":
			return "video/x-matroska";
		default:
			return "video/mp4";
	}
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
