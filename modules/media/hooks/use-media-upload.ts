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
import { generateVideoThumbnail, isThumbnailGenerationSupported } from "./use-video-thumbnail";

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

/**
 * Checks if a file has a valid media MIME type (image/* or video/*)
 */
function isValidMediaType(file: File): boolean {
	return file.type.startsWith("image/") || file.type.startsWith("video/");
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Production-ready hook for media uploads (images and videos)
 *
 * Features:
 * - Parallel batch image upload
 * - Queue system: add files during an active upload
 * - Client-side video thumbnail generation (Canvas API)
 * - Retry with exponential backoff
 * - Cancellation via AbortController
 * - Real-time progress tracking
 * - File validation (MIME type, size, count)
 *
 * @example
 * ```tsx
 * const { upload, isUploading, progress, cancel } = useMediaUpload({
 *   maxFiles: 5,
 *   onProgress: (p) => console.log(`${p.completed}/${p.total}`),
 *   onSuccess: (results) => console.log('Uploaded:', results),
 * });
 *
 * // Can call upload() multiple times — files are queued automatically
 * const handleDrop = async (files: File[]) => {
 *   const results = await upload(files);
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
	const [queuedCount, setQueuedCount] = useState(0);
	const abortControllerRef = useRef<AbortController | null>(null);
	const isProcessingRef = useRef(false);
	const queueRef = useRef<
		Array<{
			files: File[];
			resolve: (results: MediaUploadResult[]) => void;
			reject: (error: Error) => void;
		}>
	>([]);
	const cumulativeResultsRef = useRef<MediaUploadResult[]>([]);
	const cumulativeCompletedRef = useRef(0);

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

	const isOversized = (file: File): boolean => {
		const maxSize = getMediaTypeFromFile(file) === "VIDEO" ? maxSizeVideo : maxSizeImage;
		return file.size > maxSize;
	};

	const updateProgress = (update: Partial<UploadProgress>) => {
		setProgress((prev) => {
			const newProgress = prev
				? { ...prev, ...update }
				: {
						total: 0,
						completed: 0,
						queued: 0,
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
		// Filter out non-image/video files
		const mediaFiles = files.filter(isValidMediaType);

		if (mediaFiles.length < files.length) {
			const rejected = files.length - mediaFiles.length;
			toast.warning(`${rejected} fichier(s) ignore(s)`, {
				description: "Seuls les images et videos sont acceptés",
			});
		}

		// Partition into valid and oversized in a single pass
		const oversized: File[] = [];
		const validSizeFiles: File[] = [];
		for (const f of mediaFiles) {
			if (isOversized(f)) {
				oversized.push(f);
			} else {
				validSizeFiles.push(f);
			}
		}

		if (oversized.length > 0) {
			const details = oversized
				.slice(0, 3)
				.map((f) => `${f.name} (${formatFileSize(f.size)})`)
				.join(", ");
			const suffix = oversized.length > 3 ? ` et ${oversized.length - 3} autre(s)` : "";

			toast.error(`${oversized.length} fichier(s) trop volumineux`, {
				description: details + suffix,
			});
		}

		if (validSizeFiles.length > maxFiles) {
			toast.warning(`Maximum ${maxFiles} fichiers`, {
				description: `${validSizeFiles.length - maxFiles} fichier(s) ignore(s)`,
			});
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
		signal: AbortSignal,
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
					{ maxAttempts: 3, baseDelay: 500, signal },
				);

				if (thumbUploadResult?.[0]?.serverData.url) {
					thumbnailUrl = thumbUploadResult[0].serverData.url;
				}

				if (thumbnailResult.previewUrl) {
					URL.revokeObjectURL(thumbnailResult.previewUrl);
				}
			} catch (error) {
				if (thumbnailResult?.previewUrl) {
					URL.revokeObjectURL(thumbnailResult.previewUrl);
				}
				// Log but continue without thumbnail
				if (!(error instanceof DOMException && error.name === "AbortError")) {
					console.warn("[useMediaUpload] Echec generation/upload thumbnail:", error);
				} else {
					throw error; // Re-throw abort errors
				}
			}
		}

		// 3. Upload the video with retry
		try {
			const videoUploadResult = await withRetry(() => startUpload([videoFile]), {
				maxAttempts: 3,
				baseDelay: 1000,
				signal,
			});

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
			// Orphan thumbnail cleanup is handled by the monthly cleanup-orphan-media cron job.
			// We don't call the server-side delete service from the client to avoid
			// bundling UTApi (server-only) into the client bundle.
			if (thumbnailUrl) {
				console.warn("[useMediaUpload] Thumbnail orphelin sera nettoyé par le cron:", thumbnailUrl);
			}
			throw error;
		}
	};

	/**
	 * Uploads images in batch
	 */
	const uploadImages = async (
		imageFiles: File[],
		signal: AbortSignal,
	): Promise<MediaUploadResult[]> => {
		if (imageFiles.length === 0) return [];

		if (signal.aborted) {
			throw new DOMException("Operation annulee", "AbortError");
		}

		const results = await withRetry(() => startUpload(imageFiles), {
			maxAttempts: 3,
			baseDelay: 1000,
			signal,
		});

		const uploadResults: MediaUploadResult[] = [];

		for (let i = 0; i < (results ?? []).length; i++) {
			const result = results![i]!;
			const serverData = result.serverData;
			if (serverData.url) {
				uploadResults.push({
					url: serverData.url,
					mediaType: "IMAGE",
					fileName: imageFiles[i]!.name,
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
		signal: AbortSignal,
	): Promise<MediaUploadResult[]> => {
		if (videoFiles.length === 0) return [];

		const results: MediaUploadResult[] = [];

		// Process in batches to limit concurrency
		for (let i = 0; i < videoFiles.length; i += videoConcurrency) {
			if (signal.aborted) {
				throw new DOMException("Operation annulee", "AbortError");
			}

			const batch = videoFiles.slice(i, i + videoConcurrency);
			updateProgress({ current: batch.map((f) => f.name).join(", ") });

			const batchResults = await Promise.allSettled(batch.map((file) => uploadVideo(file, signal)));

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
	// BATCH PROCESSING (single batch of files)
	// ========================================================================

	const processBatch = async (files: File[], signal: AbortSignal): Promise<MediaUploadResult[]> => {
		// Separate images and videos
		const images = files.filter((f) => getMediaTypeFromFile(f) === "IMAGE");
		const videos = files.filter((f) => getMediaTypeFromFile(f) === "VIDEO");

		updateProgress({ phase: "uploading", current: `${images.length} image(s)` });

		const uploadResults: MediaUploadResult[] = [];

		// Upload images in batch
		if (images.length > 0) {
			updateProgress({ current: `${images.length} image(s)`, phase: "uploading" });
			const imageResults = await uploadImages(images, signal);
			uploadResults.push(...imageResults);
			cumulativeCompletedRef.current += imageResults.length;
			updateProgress({ completed: cumulativeCompletedRef.current });
		}

		// Upload videos
		if (videos.length > 0) {
			updateProgress({ phase: "generating-thumbnails" });
			const videoResults = await uploadVideos(videos, signal);
			uploadResults.push(...videoResults);
			cumulativeCompletedRef.current += videoResults.length;
			updateProgress({ completed: cumulativeCompletedRef.current });
		}

		return uploadResults;
	};

	// ========================================================================
	// QUEUE PROCESSING
	// ========================================================================

	const processQueue = async () => {
		if (isProcessingRef.current) return;
		isProcessingRef.current = true;

		// Create a single AbortController for the entire queue session
		abortControllerRef.current?.abort();
		abortControllerRef.current = new AbortController();
		const signal = abortControllerRef.current.signal;

		// Reset cumulative counters
		cumulativeResultsRef.current = [];
		cumulativeCompletedRef.current = 0;

		try {
			while (queueRef.current.length > 0) {
				const entry = queueRef.current.shift()!;
				setQueuedCount(queueRef.current.length);

				// Calculate total including remaining queue
				const queuedFileCount = queueRef.current.reduce((sum, e) => sum + e.files.length, 0);
				updateProgress({
					total: cumulativeCompletedRef.current + entry.files.length + queuedFileCount,
					queued: queuedFileCount,
				});

				try {
					const batchResults = await processBatch(entry.files, signal);
					cumulativeResultsRef.current.push(...batchResults);
					entry.resolve(batchResults);
				} catch (error) {
					if (error instanceof DOMException && error.name === "AbortError") {
						entry.resolve([]); // Resolve with empty on cancel
						// Resolve remaining queue entries
						for (const remaining of queueRef.current) {
							remaining.resolve([]);
						}
						queueRef.current = [];
						setQueuedCount(0);
						setProgress(null);
						isProcessingRef.current = false;
						return;
					}

					const err = error instanceof Error ? error : new Error(String(error));
					onError?.(err);
					toast.error("Echec de l'upload", { description: err.message });
					entry.resolve([]); // Resolve with empty on error, continue queue
				}
			}

			// All batches done
			updateProgress({ phase: "done", completed: cumulativeCompletedRef.current, queued: 0 });
			onSuccess?.(cumulativeResultsRef.current);

			setTimeout(() => {
				setProgress(null);
				cumulativeResultsRef.current = [];
				cumulativeCompletedRef.current = 0;
			}, 1000);
		} finally {
			isProcessingRef.current = false;
		}
	};

	// ========================================================================
	// MAIN UPLOAD FUNCTION
	// ========================================================================

	const upload = async (files: File[]): Promise<MediaUploadResult[]> => {
		// Validate files
		updateProgress({
			phase: "validating",
			total: files.length,
			completed: cumulativeCompletedRef.current,
			queued: queueRef.current.length,
		});
		const validFiles = validateFiles(files);

		if (validFiles.length === 0) {
			if (!isProcessingRef.current) {
				setProgress(null);
			}
			return [];
		}

		// Create a promise that resolves when this batch is uploaded
		return new Promise<MediaUploadResult[]>((resolve, reject) => {
			queueRef.current.push({ files: validFiles, resolve, reject });
			setQueuedCount(queueRef.current.length);

			// Update total to reflect new queued files
			const totalQueued = queueRef.current.reduce((sum, e) => sum + e.files.length, 0);
			updateProgress({
				total: cumulativeCompletedRef.current + totalQueued,
				queued: totalQueued,
			});

			// Start processing if not already running
			if (!isProcessingRef.current) {
				void processQueue();
			}
		});
	};

	const uploadSingle = async (file: File): Promise<MediaUploadResult | null> => {
		const results = await upload([file]);
		return results[0] ?? null;
	};

	const cancel = () => {
		abortControllerRef.current?.abort();
		abortControllerRef.current = null;
		// Clear the queue
		for (const entry of queueRef.current) {
			entry.resolve([]);
		}
		queueRef.current = [];
		setQueuedCount(0);
		setProgress(null);
		cumulativeResultsRef.current = [];
		cumulativeCompletedRef.current = 0;
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
		queuedCount,
		getMediaType: getMediaTypeFromFile,
		isOversized,
	};
}
