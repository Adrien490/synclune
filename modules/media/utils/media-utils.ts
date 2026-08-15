/**
 * Utilities for media management (images and videos)
 */

import type { MediaType } from "@/app/generated/prisma/client";

/**
 * Checks if a media is a video using the database mediaType field.
 * This is the RECOMMENDED method as it is reliable even with extensionless URLs (e.g. UploadThing).
 * @param mediaType - The media type from the database
 * @returns true if the media is a video, false otherwise
 */
export function isVideo(type: MediaType): boolean {
	return type === "VIDEO";
}

/**
 * Checks if a media is an image using the database mediaType field.
 * @param mediaType - The media type from the database
 * @returns true if the media is an image, false otherwise
 */
export function isImage(type: MediaType): boolean {
	return type === "IMAGE";
}

/**
 * Résout la source affichable d'un média pour un rendu `next/image`.
 *
 * Schéma lean : plus de poster (`thumbnailUrl`) en base. Une vidéo n'est pas
 * décodable par l'optimiseur d'images — retourner l'URL `.mp4` produirait une
 * vignette cassée + une transformation facturée pour rien : on retourne `null`
 * afin que l'appelant affiche un placeholder (cf. `gallery/thumbnail.tsx`).
 *
 * @returns L'URL à passer à `<Image src>`, ou `null` si aucun rendu image n'est possible
 */
export function resolveMediaThumbSrc(media: { url: string; type: MediaType }): string | null {
	if (media.type === "VIDEO") {
		return null;
	}
	return media.url;
}

/** Video extension to MIME type mapping */
const VIDEO_MIME_TYPES: Record<string, string> = {
	mp4: "video/mp4",
};

/**
 * Gets the MIME type of a video from its URL.
 * Uses a regex to extract the extension at the end of the URL (before query string).
 * @param url - The video URL
 * @returns The video MIME type
 */
export function getVideoMimeType(url: string): string {
	// Extract file extension (before query params)
	const extensionMatch = url.toLowerCase().match(/\.(\w+)(?:\?|#|$)/);
	const extension = extensionMatch?.[1];

	// CDN URLs without extension (e.g. UploadThing) - fallback to mp4
	if (!extension) {
		return "video/mp4";
	}

	return VIDEO_MIME_TYPES[extension] ?? "video/mp4";
}
