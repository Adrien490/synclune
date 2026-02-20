"use client";

import { useEffect, useRef, useState } from "react";
import { useUploadThing } from "@/modules/media/utils/uploadthing";
import { withRetry } from "@/shared/utils/with-retry";
import { toast } from "sonner";
import type {
	UseMediaUploadOptions,
	MediaUploadResult,
	UploadProgress,
	UseMediaUploadReturn,
	VideoThumbnailResult,
} from "../types/hooks.types";
import {
	generateVideoThumbnail,
	isThumbnailGenerationSupported,
} from "./use-video-thumbnail";
import { deleteUploadThingFilesFromUrls } from "../services/delete-uploadthing-files.service";

// Re-export types for backwards compatibility
export type {
	UseMediaUploadOptions,
	MediaUploadResult,
	UploadProgress,
	UseMediaUploadReturn,
};

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MAX_SIZE_IMAGE = 16 * 1024 * 1024; // 16MB
const DEFAULT_MAX_SIZE_VIDEO = 512 * 1024 * 1024; // 512MB
const DEFAULT_MAX_FILES = 6;
const DEFAULT_VIDEO_CONCURRENCY = 2;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formats a byte size into a human-readable string
 */
function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Determines the media type from the MIME type
 */
function getMediaTypeFromFile(file: File): "IMAGE" | "VIDEO" {
	return file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Production-ready hook for media uploads (images and videos)
 *
 * Features:
 * - Parallel batch image upload
 * - Client-side video thumbnail generation (Canvas API)
 * - Retry with exponential backoff
 * - Cancellation via AbortController
 * - Real-time progress tracking
 * - File validation (size, type, count)
 *
 * @example
 * ```tsx
 * const { upload, isUploading, progress, cancel } = useMediaUpload({
 *   maxFiles: 5,
 *   onProgress: (p) => console.log(`${p.completed}/${p.total}`),
 *   onSuccess: (results) => console.log('Uploaded:', results),
 * });
 *
 * const handleDrop = async (files: File[]) => {
 *   const results = await upload(files);
 *   // results contains the uploaded file URLs
 * };
 * ```
 */
export function useMediaUpload(options: UseMediaUploadOptions = {}): UseMediaUploadReturn {
	const {
		maxSizeImage = DEFAULT_MAX_SIZE_IMAGE,
		maxSizeVideo = DEFAULT_MAX_SIZE_VIDEO,
		maxFiles = DEFAULT_MAX_FILES,
		videoConcurrency = DEFAULT_VIDEO_CONCURRENCY,
		onSuccess,
		onError,
		onProgress,
	} = options;

	const [progress, setProgress] = useState<UploadProgress | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const { startUpload, isUploading: isUploadThingUploading } = useUploadThing("catalogMedia");

	// Abort in-progress uploads on unmount
	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
		};
	}, []);

	// ========================================================================
	// UTILITIES
	// ========================================================================

	const getMediaType = (file: File): "IMAGE" | "VIDEO" => getMediaTypeFromFile(file);

	const isOversized = (file: File): boolean => {
		const maxSize = getMediaType(file) === "VIDEO" ? maxSizeVideo : maxSizeImage;
		return file.size > maxSize;
	};

	const updateProgress = (update: Partial<UploadProgress>) => {
		setProgress(prev => {
			const newProgress = prev ? { ...prev, ...update } : {
				total: 0,
				completed: 0,
				phase: "validating" as const,
				...update,
			};
			onProgress?.(newProgress);
			return newProgress;
		});
	};

	// ========================================================================
	// VALIDATION
	// ========================================================================

	const validateFiles = (files: File[]): File[] => {
		const oversized = files.filter(isOversized);
		const validSizeFiles = files.filter(f => !isOversized(f));

		if (oversized.length > 0) {
			const details = oversized
				.slice(0, 3)
				.map(f => `${f.name} (${formatFileSize(f.size)})`)
				.join(", ");
			const suffix = oversized.length > 3 ? ` et ${oversized.length - 3} autre(s)` : "";

			toast.error(
				`${oversized.length} fichier(s) trop volumineux`,
				{ description: details + suffix }
			);
		}

		if (validSizeFiles.length > maxFiles) {
			toast.warning(
				`Maximum ${maxFiles} fichiers`,
				{ description: `${validSizeFiles.length - maxFiles} fichier(s) ignore(s)` }
			);
			return validSizeFiles.slice(0, maxFiles);
		}

		return validSizeFiles;
	};

	// ========================================================================
	// UPLOAD FUNCTIONS
	// ========================================================================

	/**
	 * Uploads a video with thumbnail generation
	 */
	const uploadVideo = async (
		videoFile: File,
		signal: AbortSignal
	): Promise<MediaUploadResult | null> => {
		let thumbnailUrl: string | undefined;
		let blurDataUrl: string | undefined;
		let thumbnailResult: VideoThumbnailResult | null = null;

		// 1. Generate thumbnail if supported
		if (isThumbnailGenerationSupported()) {
			try {
				thumbnailResult = await generateVideoThumbnail(videoFile, { signal });
				blurDataUrl = thumbnailResult.blurDataUrl;

				// 2. Upload the thumbnail with retry
				const thumbUploadResult = await withRetry(
					() => startUpload([thumbnailResult!.thumbnailFile]),
					{ maxAttempts: 3, baseDelay: 500, signal }
				);

				if (thumbUploadResult?.[0]?.serverData?.url) {
					thumbnailUrl = thumbUploadResult[0].serverData.url;
				}
			} catch (error) {
				// Log but continue without thumbnail
				if (!(error instanceof DOMException && error.name === "AbortError")) {
					console.warn("[useMediaUpload] Echec generation/upload thumbnail:", error);
				} else {
					throw error; // Re-throw abort errors
				}
			} finally {
				// Cleanup preview URL
				if (thumbnailResult?.previewUrl) {
					URL.revokeObjectURL(thumbnailResult.previewUrl);
				}
			}
		}

		// 3. Upload the video with retry
		try {
			const videoUploadResult = await withRetry(
				() => startUpload([videoFile]),
				{ maxAttempts: 3, baseDelay: 1000, signal }
			);

			const serverData = videoUploadResult?.[0]?.serverData;
			if (serverData?.url) {
				return {
					url: serverData.url,
					mediaType: "VIDEO",
					fileName: videoFile.name,
					thumbnailUrl,
					blurDataUrl,
				};
			}

			return null;
		} catch (error) {
			// Cleanup orphan thumbnail if video upload fails
			if (thumbnailUrl) {
				deleteUploadThingFilesFromUrls([thumbnailUrl]).catch((cleanupError) => {
					console.warn("[useMediaUpload] Echec nettoyage thumbnail orphelin:", cleanupError);
				});
			}
			throw error;
		}
	};

	/**
	 * Uploads images in batch
	 */
	const uploadImages = async (
		imageFiles: File[],
		signal: AbortSignal
	): Promise<MediaUploadResult[]> => {
		if (imageFiles.length === 0) return [];

		if (signal.aborted) {
			throw new DOMException("Operation annulee", "AbortError");
		}

		const results = await withRetry(
			() => startUpload(imageFiles),
			{ maxAttempts: 3, baseDelay: 1000, signal }
		);

		const uploadResults: MediaUploadResult[] = [];

		for (let i = 0; i < (results || []).length; i++) {
			const result = results![i];
			const serverData = result.serverData;
			if (serverData?.url) {
				uploadResults.push({
					url: serverData.url,
					mediaType: "IMAGE",
					fileName: imageFiles[i].name,
					blurDataUrl: serverData.blurDataUrl ?? undefined,
				});
			}
		}

		return uploadResults;
	};

	/**
	 * Uploads videos in parallel with concurrency limit
	 */
	const uploadVideos = async (
		videoFiles: File[],
		signal: AbortSignal
	): Promise<MediaUploadResult[]> => {
		if (videoFiles.length === 0) return [];

		const results: MediaUploadResult[] = [];

		// Process in batches to limit concurrency
		for (let i = 0; i < videoFiles.length; i += videoConcurrency) {
			if (signal.aborted) {
				throw new DOMException("Operation annulee", "AbortError");
			}

			const batch = videoFiles.slice(i, i + videoConcurrency);
			updateProgress({ current: batch.map(f => f.name).join(", ") });

			const batchResults = await Promise.allSettled(
				batch.map(file => uploadVideo(file, signal))
			);

			for (const result of batchResults) {
				if (result.status === "fulfilled" && result.value) {
					results.push(result.value);
				} else if (result.status === "rejected") {
					// Check for abort
					if (result.reason instanceof DOMException && result.reason.name === "AbortError") {
						throw result.reason;
					}
					console.warn("[useMediaUpload] Echec upload video:", result.reason);
				}
			}
		}

		return results;
	};

	// ========================================================================
	// MAIN UPLOAD FUNCTION
	// ========================================================================

	const upload = async (files: File[]): Promise<MediaUploadResult[]> => {
		// Create a new AbortController
		abortControllerRef.current?.abort();
		abortControllerRef.current = new AbortController();
		const signal = abortControllerRef.current.signal;

		// Validate files
		updateProgress({ phase: "validating", total: files.length, completed: 0 });
		const validFiles = validateFiles(files);

		if (validFiles.length === 0) {
			setProgress(null);
			return [];
		}

		// Separate images and videos
		const images = validFiles.filter(f => getMediaType(f) === "IMAGE");
		const videos = validFiles.filter(f => getMediaType(f) === "VIDEO");
		const totalFiles = images.length + videos.length;

		updateProgress({ total: totalFiles, completed: 0, phase: "uploading" });

		const uploadResults: MediaUploadResult[] = [];

		try {
			// Upload images in batch
			if (images.length > 0) {
				updateProgress({ current: `${images.length} image(s)`, phase: "uploading" });
				const imageResults = await uploadImages(images, signal);
				uploadResults.push(...imageResults);
				updateProgress({ completed: imageResults.length });
			}

			// Upload videos
			if (videos.length > 0) {
				updateProgress({ phase: "generating-thumbnails" });
				const videoResults = await uploadVideos(videos, signal);
				uploadResults.push(...videoResults);
				updateProgress({ completed: uploadResults.length });
			}

			updateProgress({ phase: "done", completed: uploadResults.length });
			onSuccess?.(uploadResults);

			return uploadResults;
		} catch (error) {
			// Handle cancellation silently
			if (error instanceof DOMException && error.name === "AbortError") {
				setProgress(null);
				return uploadResults; // Return what was uploaded
			}

			const err = error instanceof Error ? error : new Error(String(error));
			onError?.(err);

			toast.error("Echec de l'upload", {
				description: err.message,
			});

			return uploadResults; // Return what was uploaded despite the error
		} finally {
			// Reset progress after a delay
			setTimeout(() => setProgress(null), 1000);
		}
	};

	const uploadSingle = async (file: File): Promise<MediaUploadResult | null> => {
		const results = await upload([file]);
		return results[0] || null;
	};

	const cancel = () => {
		abortControllerRef.current?.abort();
		abortControllerRef.current = null;
		setProgress(null);
	};

	// ========================================================================
	// RETURN
	// ========================================================================

	return {
		upload,
		uploadSingle,
		validateFiles,
		cancel,
		isUploading: isUploadThingUploading || progress !== null,
		progress,
		getMediaType,
		isOversized,
	};
}
