/**
 * Barrel re-export for backwards compatibility.
 * Prefer importing directly from the specific constant files.
 */

export {
	MAX_MEDIA_PER_ITEM,
	MAX_GALLERY_MEDIA,
	MAX_GALLERY_IMAGES,
	VIDEO_EXTENSIONS,
	IMAGE_EXTENSIONS,
	VIDEO_MIME_TYPES,
	IMAGE_MIME_TYPES,
} from "./media-limits.constants";

export {
	THUMBNAIL_CONFIG,
	CLIENT_THUMBNAIL_CONFIG,
	FRAME_VALIDATION,
	VIDEO_EVENT_TIMEOUTS,
	ALLOWED_UPLOADTHING_DOMAINS,
	VIDEO_MIGRATION_CONFIG,
	VIDEO_AUDIO_CONFIG,
} from "./thumbnail.constants";
export type { ThumbnailSize } from "./thumbnail.constants";

export { IMAGE_DOWNLOADER_CONFIG, THUMBHASH_CONFIG } from "./image-downloader.constants";

export { UI_DELAYS, LIGHTBOX_CONFIG } from "./ui-interactions.constants";
