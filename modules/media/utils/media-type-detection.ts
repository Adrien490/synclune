/**
 * Utilitaires de detection du type de media base sur l'URL ou l'extension
 */

import { VIDEO_EXTENSIONS, IMAGE_EXTENSIONS } from "../constants/media.constants";

/**
 * Verifie si une URL pointe vers une video basee sur son extension
 */
export function isVideoUrl(url: string): boolean {
	const lowercaseUrl = url.toLowerCase();
	return VIDEO_EXTENSIONS.some((ext) => lowercaseUrl.endsWith(ext));
}

/**
 * Verifie si une URL pointe vers une image basee sur son extension
 */
export function isImageUrl(url: string): boolean {
	const lowercaseUrl = url.toLowerCase();
	return IMAGE_EXTENSIONS.some((ext) => lowercaseUrl.endsWith(ext));
}

/**
 * Detecte le type de media (IMAGE ou VIDEO) base sur l'URL
 */
export function detectMediaType(url: string): "IMAGE" | "VIDEO" {
	return isVideoUrl(url) ? "VIDEO" : "IMAGE";
}

/**
 * Obtient l'extension d'un fichier depuis son URL
 */
export function getFileExtension(url: string): string | null {
	const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
	return match ? `.${match[1].toLowerCase()}` : null;
}
