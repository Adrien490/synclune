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
 * @param url - L'URL de la vidéo
 * @returns Le type MIME de la vidéo
 */
export function getVideoMimeType(url: string): string {
	const urlLower = url.toLowerCase();

	if (urlLower.includes(".webm")) return "video/webm";
	if (urlLower.includes(".ogg")) return "video/ogg";
	if (urlLower.includes(".mov")) return "video/quicktime";
	if (urlLower.includes(".avi")) return "video/x-msvideo";
	if (urlLower.includes(".mkv")) return "video/x-matroska";

	// Default pour .mp4 et autres
	return "video/mp4";
}

/**
 * Génère une liste de sources vidéo avec fallback
 * Utile pour compatibilité multi-navigateurs
 * @param url - L'URL principale de la vidéo
 * @returns Array de sources avec types MIME
 */
export function getVideoSources(url: string): Array<{ src: string; type: string }> {
	const sources = [{ src: url, type: getVideoMimeType(url) }];

	// Si c'est un MP4, suggérer WebM en fallback (meilleure compression)
	if (url.includes(".mp4")) {
		const webmUrl = url.replace(".mp4", ".webm");
		sources.unshift({ src: webmUrl, type: "video/webm" });
	}

	return sources;
}
