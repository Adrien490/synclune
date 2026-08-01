"use client";

/**
 * Génération + upload du thumbnail vidéo + cleanup orphelin.
 *
 * Extrait de `useMediaUpload` (audit P1.4) pour isoler la pipeline "video
 * thumbnail" du reste du hook orchestrateur :
 *
 * 1. Generate thumbnail (Canvas API via `use-video-thumbnail`).
 * 2. Upload du thumbnail (avec retry + signal).
 * 3. Revoke ObjectURL preview.
 * 4. Cleanup orphan thumbnail si l'upload vidéo principal échoue downstream.
 *
 * Le `startUpload` est injecté en paramètre pour ne pas créer une seconde
 * instance `useUploadThing` (qui dupliquerait le batch-percent callback).
 */

import {
	generateVideoThumbnail,
	isThumbnailGenerationSupported,
} from "@/modules/media/hooks/use-video-thumbnail";
import type { VideoThumbnailResult } from "@/modules/media/types/hooks.types";
import { deleteUploadThingFile } from "@/modules/media/actions/delete-uploadthing-file";
import { withRetry } from "@/shared/utils/with-retry";

interface ThumbnailUploadResult {
	thumbnailUrl?: string;
	blurDataUrl?: string;
	/** Dimensions du poster (le thumbnail est une image : le serveur les lit) */
	width?: number;
	height?: number;
}

export interface UseVideoThumbnailUploadOptions {
	/** Injection : `startUpload` exposé par `useUploadThing` parent. */
	startUpload: (files: File[]) => Promise<
		| Array<{
				serverData: { url: string; width?: number | null; height?: number | null };
		  }>
		| undefined
	>;
}

export interface UseVideoThumbnailUploadReturn {
	/**
	 * Génère et upload le thumbnail d'une vidéo. Best-effort sauf AbortError
	 * (re-thrown pour propager l'annulation parent).
	 *
	 * @throws DOMException("AbortError") si le signal parent abort
	 */
	uploadThumbnailForVideo: (videoFile: File, signal: AbortSignal) => Promise<ThumbnailUploadResult>;

	/**
	 * Best-effort cleanup d'un thumbnail orphelin (fire-and-forget).
	 * Appelé quand l'upload vidéo principal échoue après thumbnail upload OK.
	 */
	cleanupOrphanThumbnail: (thumbnailUrl: string) => void;
}

const cleanupOrphanThumbnail = (thumbnailUrl: string): void => {
	void (async () => {
		try {
			const formData = new FormData();
			formData.append("fileUrl", thumbnailUrl);
			await deleteUploadThingFile(undefined, formData);
		} catch (cleanupError) {
			if (process.env.NODE_ENV === "development") {
				console.warn("[useVideoThumbnailUpload] Cleanup thumbnail orphelin échoué:", cleanupError);
			}
		}
	})();
};

export function useVideoThumbnailUpload(
	options: UseVideoThumbnailUploadOptions,
): UseVideoThumbnailUploadReturn {
	const { startUpload } = options;

	const uploadThumbnailForVideo = async (
		videoFile: File,
		signal: AbortSignal,
	): Promise<ThumbnailUploadResult> => {
		if (!isThumbnailGenerationSupported()) {
			return {};
		}

		let thumbnailResult: VideoThumbnailResult | null = null;
		try {
			thumbnailResult = await generateVideoThumbnail(videoFile, { signal });
			const blurDataUrl = thumbnailResult.blurDataUrl;

			const thumbUploadResult = await withRetry(
				() => startUpload([thumbnailResult!.thumbnailFile]),
				{ maxAttempts: 3, baseDelay: 500, signal },
			);

			const thumbServerData = thumbUploadResult?.[0]?.serverData;
			const thumbnailUrl = thumbServerData?.url;

			if (thumbnailResult.previewUrl) {
				URL.revokeObjectURL(thumbnailResult.previewUrl);
			}

			// Le poster EST une image : ses dimensions décrivent le ratio de la vidéo,
			// ce qui suffit à dimensionner la vignette côté client.
			return {
				thumbnailUrl,
				blurDataUrl,
				width: thumbServerData?.width ?? undefined,
				height: thumbServerData?.height ?? undefined,
			};
		} catch (error) {
			if (thumbnailResult?.previewUrl) {
				URL.revokeObjectURL(thumbnailResult.previewUrl);
			}
			if (error instanceof DOMException && error.name === "AbortError") {
				throw error;
			}
			if (process.env.NODE_ENV === "development") {
				console.warn("[useVideoThumbnailUpload] Echec generation/upload thumbnail:", error);
			}
			return {};
		}
	};

	return { uploadThumbnailForVideo, cleanupOrphanThumbnail };
}
