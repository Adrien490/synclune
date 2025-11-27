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
 * Détermine si une URL pointe vers un fichier image
 * @param url - L'URL du fichier à vérifier
 * @returns true si l'URL est une image, false sinon
 */
export function isImageUrl(url: string): boolean {
	const imageExtensions = [
		".jpg",
		".jpeg",
		".png",
		".gif",
		".webp",
		".avif",
		".svg",
	];
	return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
}

/**
 * Obtient le type de média d'une URL (en se basant sur l'extension)
 * ⚠️ ATTENTION: Méthode legacy, peut échouer avec URLs sans extension
 * @param url - L'URL du fichier à vérifier
 * @returns "video", "image" ou "unknown"
 */
export function getMediaType(url: string): "video" | "image" | "unknown" {
	const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
	const isVideo = videoExtensions.some((ext) => url.toLowerCase().includes(ext));
	if (isVideo) return "video";
	if (isImageUrl(url)) return "image";
	return "unknown";
}

/**
 * Détecte le MediaType Prisma depuis une URL (en se basant sur l'extension)
 * Utilisé lors de l'upload pour définir le champ mediaType en base de données
 * @param url - L'URL du fichier uploadé
 * @returns "VIDEO" si vidéo, "IMAGE" par défaut
 */
export function detectMediaType(url: string): "IMAGE" | "VIDEO" {
	const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
	const isVideo = videoExtensions.some((ext) => url.toLowerCase().includes(ext));
	return isVideo ? "VIDEO" : "IMAGE";
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
