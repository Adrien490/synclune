"use client";

import { useEffect, useRef, useState } from "react";
import { useUploadThing } from "@/modules/media/utils/uploadthing";
import {
	DEFAULT_MAX_SIZE_IMAGE,
	DEFAULT_MAX_SIZE_VIDEO,
	DEFAULT_MAX_FILES,
	DEFAULT_VIDEO_CONCURRENCY,
	formatFileSize,
	getMediaTypeFromFile,
	isValidMediaType,
} from "@/modules/media/utils/upload-helpers";
import { compressImage, HeicDecodeError, isHeicFile } from "@/modules/media/utils/compress-image";
import { deleteUploadThingFile } from "@/modules/media/actions/delete-uploadthing-file";
import { withRetry } from "@/shared/utils/with-retry";
import { toast } from "@/shared/utils/toast";
import type {
	UseMediaUploadOptions,
	MediaUploadResult,
	UploadProgress,
	UseMediaUploadReturn,
	VideoThumbnailResult,
	FailedUpload,
	FileProgress,
	FileProgressState,
} from "../types/hooks.types";
import { generateVideoThumbnail, isThumbnailGenerationSupported } from "./use-video-thumbnail";

/**
 * Production-ready hook for media uploads (images and videos)
 *
 * Features:
 * - Client-side image compression (HEIC, EXIF rotation, WebP output)
 * - Parallel batch image upload
 * - Queue system: add files during an active upload
 * - Client-side video thumbnail generation (Canvas API)
 * - Retry with exponential backoff (network) + manual retry for failed files
 * - Cancellation via AbortController
 * - Real-time progress tracking with phase
 * - Per-file error tracking exposed via failedFiles
 */
export function useMediaUpload(options: UseMediaUploadOptions = {}): UseMediaUploadReturn {
	const {
		endpoint = "catalogMedia",
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
	const [failedFiles, setFailedFiles] = useState<FailedUpload[]>([]);
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
	const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const onProgressRef = useRef(onProgress);
	// eslint-disable-next-line react-hooks/refs
	onProgressRef.current = onProgress;
	const onSuccessRef = useRef(onSuccess);
	// eslint-disable-next-line react-hooks/refs
	onSuccessRef.current = onSuccess;
	const onErrorRef = useRef(onError);
	// eslint-disable-next-line react-hooks/refs
	onErrorRef.current = onError;

	const { startUpload, isUploading: isUploadThingUploading } = useUploadThing(endpoint);

	// Abort in-progress uploads and clear timers on unmount
	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
			if (doneTimeoutRef.current) {
				clearTimeout(doneTimeoutRef.current);
			}
		};
	}, []);

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
						files: [],
						...update,
					};
			onProgressRef.current?.(newProgress);
			return newProgress;
		});
	};

	const setFileProgressList = (files: File[]) => {
		const entries: FileProgress[] = files.map((file) => ({
			fileName: file.name,
			state: "queued",
			percent: 0,
			sizeBytes: file.size,
			mediaType: getMediaTypeFromFile(file),
		}));
		updateProgress({ files: entries });
	};

	const updateFileEntry = (fileName: string, update: Partial<FileProgress>) => {
		setProgress((prev) => {
			if (!prev?.files) return prev;
			const nextFiles = prev.files.map((entry) =>
				entry.fileName === fileName ? { ...entry, ...update } : entry,
			);
			const next = { ...prev, files: nextFiles };
			onProgressRef.current?.(next);
			return next;
		});
	};

	const markFileState = (fileName: string, state: FileProgressState, error?: string) => {
		updateFileEntry(fileName, {
			state,
			percent: state === "done" ? 100 : state === "failed" ? 0 : undefined,
			error,
		});
	};

	const pushFailed = (file: File, error: string) => {
		setFailedFiles((prev) => [...prev, { fileName: file.name, error, file }]);
		markFileState(file.name, "failed", error);
	};

	/**
	 * Pre-compress image files (> 1MB) before validation/upload.
	 * Handles HEIC decode failures by surfacing a clear error and skipping the file.
	 */
	const prepareFiles = async (files: File[]): Promise<File[]> => {
		const prepared: File[] = [];
		const needsCompression = files.some(
			(f) => getMediaTypeFromFile(f) === "IMAGE" && f.size > 1024 * 1024,
		);
		if (needsCompression) {
			updateProgress({ phase: "compressing" });
		}
		for (const file of files) {
			if (getMediaTypeFromFile(file) === "VIDEO") {
				prepared.push(file);
				continue;
			}
			if (file.size > 1024 * 1024) {
				updateProgress({ phase: "compressing", current: file.name });
				markFileState(file.name, "compressing");
			}
			try {
				const result = await compressImage(file);
				prepared.push(result.file);
			} catch (err) {
				if (err instanceof HeicDecodeError) {
					toast.error("Fichier HEIC illisible", {
						description: err.message,
						duration: 8000,
					});
					pushFailed(file, "Fichier HEIC corrompu ou non supporté");
					continue;
				}
				if (isHeicFile(file)) {
					prepared.push(file);
				} else {
					console.warn("[useMediaUpload] Compression échouée:", file.name, err);
					prepared.push(file);
				}
			}
		}

		return prepared;
	};

	const validateFiles = (files: File[]): File[] => {
		const mediaFiles = files.filter(isValidMediaType);

		if (mediaFiles.length < files.length) {
			const rejected = files.length - mediaFiles.length;
			toast.warning(`${rejected} fichier(s) ignoré(s)`, {
				description: "Seules les images et vidéos sont acceptées",
			});
		}

		const oversized: File[] = [];
		const validSizeFiles: File[] = [];
		for (const f of mediaFiles) {
			if (isOversized(f)) {
				oversized.push(f);
				pushFailed(f, `Fichier trop volumineux (${formatFileSize(f.size)})`);
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
				description: `${validSizeFiles.length - maxFiles} fichier(s) ignoré(s)`,
			});
			return validSizeFiles.slice(0, maxFiles);
		}

		return validSizeFiles;
	};

	const uploadVideo = async (
		videoFile: File,
		signal: AbortSignal,
	): Promise<MediaUploadResult | null> => {
		let thumbnailUrl: string | undefined;
		let blurDataUrl: string | undefined;
		let thumbnailResult: VideoThumbnailResult | null = null;

		if (isThumbnailGenerationSupported()) {
			try {
				thumbnailResult = await generateVideoThumbnail(videoFile, { signal });
				blurDataUrl = thumbnailResult.blurDataUrl;

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
				if (!(error instanceof DOMException && error.name === "AbortError")) {
					console.warn("[useMediaUpload] Echec generation/upload thumbnail:", error);
				} else {
					throw error;
				}
			}
		}

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
			if (thumbnailUrl) {
				// Best-effort synchronous cleanup of orphan thumbnail.
				// Only catalogMedia uploads videos (reviewMedia rejects them server-side),
				// and the deleteUploadThingFile action is admin-gated — matches the catalog flow.
				const orphanUrl = thumbnailUrl;
				void (async () => {
					try {
						const formData = new FormData();
						formData.append("fileUrl", orphanUrl);
						await deleteUploadThingFile(undefined, formData);
					} catch (cleanupError) {
						console.warn("[useMediaUpload] Cleanup thumbnail orphelin échoué:", cleanupError);
					}
				})();
			}
			throw error;
		}
	};

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

	const uploadVideos = async (
		videoFiles: File[],
		signal: AbortSignal,
	): Promise<MediaUploadResult[]> => {
		if (videoFiles.length === 0) return [];

		const results: MediaUploadResult[] = [];

		for (let i = 0; i < videoFiles.length; i += videoConcurrency) {
			if (signal.aborted) {
				throw new DOMException("Operation annulee", "AbortError");
			}

			const batch = videoFiles.slice(i, i + videoConcurrency);
			updateProgress({ current: batch.map((f) => f.name).join(", ") });

			const batchResults = await Promise.allSettled(batch.map((file) => uploadVideo(file, signal)));

			for (let j = 0; j < batchResults.length; j++) {
				const result = batchResults[j]!;
				const file = batch[j]!;
				if (result.status === "fulfilled" && result.value) {
					results.push(result.value);
				} else if (result.status === "rejected") {
					if (result.reason instanceof DOMException && result.reason.name === "AbortError") {
						throw result.reason;
					}
					const message =
						result.reason instanceof Error ? result.reason.message : "Échec du téléversement vidéo";
					pushFailed(file, message);
					console.warn("[useMediaUpload] Echec upload video:", result.reason);
				}
			}
		}

		return results;
	};

	const processBatch = async (
		rawFiles: File[],
		signal: AbortSignal,
	): Promise<MediaUploadResult[]> => {
		// 1. Pre-compress images (> 1MB) and surface HEIC decode failures
		updateProgress({ phase: "validating" });
		setFileProgressList(rawFiles);
		const prepared = await prepareFiles(rawFiles);
		if (signal.aborted) {
			throw new DOMException("Operation annulee", "AbortError");
		}

		// 2. Validate (MIME, size, count) — drops oversized into failedFiles
		const files = validateFiles(prepared);
		if (files.length === 0) return [];

		// 3. Reconcile total based on validated count (raw input may have been larger)
		const queuedFileCount = queueRef.current.reduce((sum, e) => sum + e.files.length, 0);
		updateProgress({
			total: cumulativeCompletedRef.current + files.length + queuedFileCount,
		});

		const images = files.filter((f) => getMediaTypeFromFile(f) === "IMAGE");
		const videos = files.filter((f) => getMediaTypeFromFile(f) === "VIDEO");

		updateProgress({ phase: "uploading", current: `${images.length} image(s)` });

		const uploadResults: MediaUploadResult[] = [];

		if (images.length > 0) {
			updateProgress({
				current: images[0]?.name ?? `${images.length} image(s)`,
				phase: "uploading",
			});
			for (const f of images) markFileState(f.name, "uploading");
			try {
				const imageResults = await uploadImages(images, signal);
				uploadResults.push(...imageResults);
				cumulativeCompletedRef.current += imageResults.length;
				updateProgress({ completed: cumulativeCompletedRef.current });

				const succeededNames = new Set(imageResults.map((r) => r.fileName));
				for (const f of images) {
					if (succeededNames.has(f.name)) {
						markFileState(f.name, "done");
					} else {
						pushFailed(f, "Échec du téléversement");
					}
				}
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") throw err;
				const message = err instanceof Error ? err.message : "Échec du téléversement image";
				for (const f of images) pushFailed(f, message);
				throw err;
			}
		}

		if (videos.length > 0) {
			updateProgress({ phase: "generating-thumbnails" });
			for (const f of videos) markFileState(f.name, "uploading");
			const videoResults = await uploadVideos(videos, signal);
			uploadResults.push(...videoResults);
			cumulativeCompletedRef.current += videoResults.length;
			updateProgress({ completed: cumulativeCompletedRef.current });
			const succeededVideoNames = new Set(videoResults.map((r) => r.fileName));
			for (const f of videos) {
				if (succeededVideoNames.has(f.name)) {
					markFileState(f.name, "done");
				}
				// failed videos are already surfaced via pushFailed() inside uploadVideos
			}
		}

		return uploadResults;
	};

	const processQueue = async () => {
		if (isProcessingRef.current) return;
		isProcessingRef.current = true;

		if (doneTimeoutRef.current) {
			clearTimeout(doneTimeoutRef.current);
			doneTimeoutRef.current = null;
		}

		abortControllerRef.current?.abort();
		abortControllerRef.current = new AbortController();
		const signal = abortControllerRef.current.signal;

		cumulativeResultsRef.current = [];
		cumulativeCompletedRef.current = 0;

		try {
			while (queueRef.current.length > 0) {
				const entry = queueRef.current.shift()!;
				setQueuedCount(queueRef.current.length);

				const queuedFileCount = queueRef.current.reduce((sum, e) => sum + e.files.length, 0);
				// Don't include entry.files in total here — raw count may be > maxFiles.
				// processBatch reconciles total after validation.
				updateProgress({ queued: queuedFileCount });

				try {
					const batchResults = await processBatch(entry.files, signal);
					cumulativeResultsRef.current.push(...batchResults);
					entry.resolve(batchResults);
				} catch (error) {
					if (error instanceof DOMException && error.name === "AbortError") {
						const keptCount = cumulativeResultsRef.current.length;
						entry.resolve([]);
						for (const remaining of queueRef.current) {
							remaining.resolve([]);
						}
						queueRef.current = [];
						setQueuedCount(0);
						setProgress(null);
						isProcessingRef.current = false;
						if (keptCount > 0) {
							toast.info("Upload annulé", {
								description: `${keptCount} fichier${keptCount > 1 ? "s" : ""} conservé${keptCount > 1 ? "s" : ""}`,
							});
						} else {
							toast.info("Upload annulé");
						}
						return;
					}

					const err = error instanceof Error ? error : new Error(String(error));
					onErrorRef.current?.(err);
					toast.error("Échec de l'upload", { description: err.message });
					entry.resolve([]);
				}
			}

			if (cumulativeResultsRef.current.length > 0) {
				updateProgress({
					phase: "finalizing",
					completed: cumulativeCompletedRef.current,
					queued: 0,
				});
				onSuccessRef.current?.(cumulativeResultsRef.current);
			}
			updateProgress({ phase: "done", completed: cumulativeCompletedRef.current, queued: 0 });

			doneTimeoutRef.current = setTimeout(() => {
				doneTimeoutRef.current = null;
				setProgress(null);
				cumulativeResultsRef.current = [];
				cumulativeCompletedRef.current = 0;
			}, 1000);
		} finally {
			isProcessingRef.current = false;
		}
	};

	const upload = (files: File[]): Promise<MediaUploadResult[]> => {
		if (files.length === 0) return Promise.resolve([]);

		// Push raw files to queue synchronously so cancel() can clear them mid-prepare.
		// processBatch() will compress + validate inside the abort-aware queue worker.
		return new Promise<MediaUploadResult[]>((resolve, reject) => {
			queueRef.current.push({ files, resolve, reject });
			setQueuedCount(queueRef.current.length);

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
		for (const entry of queueRef.current) {
			entry.resolve([]);
		}
		queueRef.current = [];
		setQueuedCount(0);
		setProgress(null);
		cumulativeResultsRef.current = [];
		cumulativeCompletedRef.current = 0;
	};

	const retryFailed = async (): Promise<MediaUploadResult[]> => {
		const toRetry = failedFiles.map((f) => f.file);
		if (toRetry.length === 0) return [];
		setFailedFiles([]);
		return upload(toRetry);
	};

	const retrySingle = async (file: File): Promise<MediaUploadResult | null> => {
		setFailedFiles((prev) => prev.filter((entry) => entry.file !== file));
		const results = await upload([file]);
		return results[0] ?? null;
	};

	const clearFailed = () => {
		setFailedFiles([]);
	};

	return {
		upload,
		uploadSingle,
		validateFiles,
		cancel,
		retryFailed,
		retrySingle,
		clearFailed,
		isUploading: isUploadThingUploading || progress !== null,
		progress,
		queuedCount,
		failedFiles,
		getMediaType: getMediaTypeFromFile,
		isOversized,
	};
}
