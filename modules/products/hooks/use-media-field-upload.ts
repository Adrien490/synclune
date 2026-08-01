import { PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE } from "@/modules/media/constants/media-limits.constants";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { toast } from "@/shared/utils/toast";

interface MediaValue {
	url: string;
	mediaType: "IMAGE" | "VIDEO";
	altText?: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string;
	/** Dimensions intrinsèques — cf. MediaItem : chaque remap doit les porter. */
	width?: number | null;
	height?: number | null;
}

export interface MediaField {
	state: { value: MediaValue[] };
	pushValue: (value: MediaValue) => void;
}

interface MediaUploadResult {
	url: string;
	mediaType: "IMAGE" | "VIDEO";
	thumbnailUrl?: string;
	blurDataUrl?: string;
	width?: number;
	height?: number;
}

interface UseMediaFieldUploadOptions {
	uploadMedia: (files: File[]) => Promise<MediaUploadResult[]>;
	getAltText: () => string | undefined;
	maxCount?: number;
	/** When true, skip video-first check (images are already being uploaded) */
	isUploading?: boolean;
}

/**
 * Handles media upload logic for product/SKU forms:
 * sorts images before videos, enforces limits, prevents video-first.
 */
export function useMediaFieldUpload({
	uploadMedia,
	getAltText,
	maxCount = ARRAY_LIMITS.SKU_MEDIA,
	isUploading = false,
}: UseMediaFieldUploadOptions) {
	const handleUpload = async (files: File[], field: MediaField) => {
		const remaining = maxCount - field.state.value.length;
		let filesToUpload = files.slice(0, remaining);

		// Sort: images first, videos last
		filesToUpload = filesToUpload.sort((a, b) => {
			const aIsVideo = a.type.startsWith("video/");
			const bIsVideo = b.type.startsWith("video/");
			if (aIsVideo === bIsVideo) return 0;
			return aIsVideo ? 1 : -1;
		});

		if (files.length > remaining) {
			triggerHaptic("error");
			toast.warning(`Seulement ${remaining} média(s) ajouté(s)`);
		}

		if (
			field.state.value.length === 0 &&
			!isUploading &&
			filesToUpload[0]?.type.startsWith("video/")
		) {
			triggerHaptic("error");
			toast.error(PRIMARY_MEDIA_MUST_BE_IMAGE_MESSAGE);
			return;
		}

		if (filesToUpload.length === 0) return;

		triggerHaptic("medium");
		try {
			const results = await uploadMedia(filesToUpload);
			const altText = getAltText();
			results.forEach((result) => {
				field.pushValue({
					url: result.url,
					altText,
					mediaType: result.mediaType,
					thumbnailUrl: result.thumbnailUrl,
					blurDataUrl: result.blurDataUrl,
					width: result.width,
					height: result.height,
				});
			});
			if (results.length > 0) triggerHaptic("success");
		} catch (err) {
			triggerHaptic("error");
			throw err;
		}
	};

	return { handleUpload };
}
