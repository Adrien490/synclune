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
export function isVideo(mediaType: MediaType): boolean {
	return mediaType === "VIDEO";
}

/**
 * Checks if a media is an image using the database mediaType field.
 * @param mediaType - The media type from the database
 * @returns true if the media is an image, false otherwise
 */
export function isImage(mediaType: MediaType): boolean {
	return mediaType === "IMAGE";
}

/** Video extension to MIME type mapping */
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

	return VIDEO_MIME_TYPES[extension] || "video/mp4";
}

/**
 * Generates a list of video sources.
 * Note: Does not generate WebM fallback since CDNs (UploadThing, etc.)
 * do not automatically create alternative versions.
 * @param url - The main video URL
 * @returns Array of sources with MIME types
 */
export function getVideoSources(url: string): Array<{ src: string; type: string }> {
	return [{ src: url, type: getVideoMimeType(url) }];
}
