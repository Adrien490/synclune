import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";
import { toast } from "sonner";

interface MediaValue {
	url: string;
	mediaType: "IMAGE" | "VIDEO";
	altText?: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string;
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
			toast.warning(`Seulement ${remaining} média(s) ajouté(s)`);
		}

		if (
			field.state.value.length === 0 &&
			!isUploading &&
			filesToUpload[0]?.type.startsWith("video/")
		) {
			toast.error("La première image doit être une image, pas une vidéo");
			return;
		}

		if (filesToUpload.length === 0) return;

		const results = await uploadMedia(filesToUpload);
		const altText = getAltText();
		results.forEach((result) => {
			field.pushValue({
				url: result.url,
				altText,
				mediaType: result.mediaType,
				thumbnailUrl: result.thumbnailUrl,
				blurDataUrl: result.blurDataUrl,
			});
		});
	};

	return { handleUpload };
}
