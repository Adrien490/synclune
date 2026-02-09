/**
 * Utilities for detecting media type based on URL or extension
 */

import { VIDEO_EXTENSIONS, IMAGE_EXTENSIONS } from "../constants/media.constants";

/**
 * Checks if a URL points to a video based on its extension
 */
export function isVideoUrl(url: string): boolean {
	const lowercaseUrl = url.toLowerCase();
	return VIDEO_EXTENSIONS.some((ext) => lowercaseUrl.endsWith(ext));
}

/**
 * Checks if a URL points to an image based on its extension
 */
export function isImageUrl(url: string): boolean {
	const lowercaseUrl = url.toLowerCase();
	return IMAGE_EXTENSIONS.some((ext) => lowercaseUrl.endsWith(ext));
}

/**
 * Detects the media type (IMAGE or VIDEO) based on the URL
 */
export function detectMediaType(url: string): "IMAGE" | "VIDEO" {
	return isVideoUrl(url) ? "VIDEO" : "IMAGE";
}

/**
 * Gets the file extension from its URL
 */
export function getFileExtension(url: string): string | null {
	const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
	return match ? `.${match[1].toLowerCase()}` : null;
}
