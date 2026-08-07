"use client";

import { useEffect, useRef, useState } from "react";
import { useUploadThing } from "@/modules/media/utils/uploadthing";
import {
	DEFAULT_MAX_SIZE_IMAGE,
	DEFAULT_MAX_SIZE_VIDEO,
	DEFAULT_MAX_FILES,
	DEFAULT_VIDEO_CONCURRENCY,
	describeRejectedFile,
	getMediaTypeFromFile,
	isValidMediaType,
} from "@/modules/media/utils/upload-helpers";
// `formatBytesShort` (français : Ko / Mo / Go) et non l'ancien `formatFileSize`
// (anglais : KB / MB) — ces tailles s'affichent sous une copie qui annonce « max
// 16 Mo », deux unités sur le même écran suggéraient deux plafonds différents.
import { formatBytesShort } from "@/modules/media/utils/format-bytes";
import { compressImage, HeicDecodeError, isHeicFile } from "@/modules/media/utils/compress-image";
import { useUploadCancellation } from "@/modules/media/hooks/use-upload-cancellation";
import { useVideoThumbnailUpload } from "@/modules/media/hooks/use-video-thumbnail-upload";
import { withRetry } from "@/shared/utils/with-retry";
import { toast } from "@/shared/utils/toast";
import type {
	UseMediaUploadOptions,
	MediaUploadResult,
	UploadProgress,
	UseMediaUploadReturn,
	FailedUpload,
	FileProgress,
	FileProgressState,
} from "../types/hooks.types";

interface UseMediaUploadOptionsExtended extends UseMediaUploadOptions {}

type CurrentBatchTracker = {
	mode: "image-batch" | "video-single";
	files: File[];
	startBytes: number;
	totalBytes: number;
};

/**
 * Production-ready hook for media uploads (images and videos)
 *
 * Features:
 * - Client-side image compression (HEIC, EXIF rotation, AVIF/WebP output)
 * - Bytes-based progress per file via UploadThing onUploadProgress
 * - Sliding-window ETA + throughput estimation
 * - Parallel batch image upload + sequential video upload (configurable concurrency)
 * - Queue system: add files during an active upload
 * - Client-side video thumbnail generation (Canvas API)
 * - Retry with exponential backoff (network) + manual retry for failed files
 * - Cancellation: global (cancel) and per-file (cancelOne) via AbortController
 * - Per-file error tracking exposed via failedFiles
 */
export function useMediaUpload(options: UseMediaUploadOptionsExtended = {}): UseMediaUploadReturn {
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

	// Bytes accounting (P0.1)
	const bytesUploadedRef = useRef(0);
	const bytesTotalRef = useRef(0);
	const currentBatchRef = useRef<CurrentBatchTracker | null>(null);

	// Per-file cancellation + sub-abort vidéo — extrait dans `useUploadCancellation` (audit P1.4 split).
	const cancellation = useUploadCancellation();

	// Latest-callback refs : écrites dans un effet post-render (jamais pendant le
	// render — React peut rejouer/abandonner un render, la mutation fuirait).
	const onProgressRef = useRef(onProgress);
	const onSuccessRef = useRef(onSuccess);
	const onErrorRef = useRef(onError);
	useEffect(() => {
		onProgressRef.current = onProgress;
		onSuccessRef.current = onSuccess;
		onErrorRef.current = onError;
	});

	// UploadThing hook with batch-percent callback that we route to the active batch (P0.1)
	const { startUpload, isUploading: isUploadThingUploading } = useUploadThing(endpoint, {
		uploadProgressGranularity: "fine",
		onUploadProgress: (percent: number) => {
			const tracker = currentBatchRef.current;
			if (!tracker) return;
			const batchUploaded = Math.min(tracker.totalBytes, (percent / 100) * tracker.totalBytes);
			const globalUploaded = tracker.startBytes + batchUploaded;
			updateBytesUploaded(globalUploaded, tracker);
		},
	});

	// Génération + upload thumbnail vidéo + cleanup orphan — extrait dans `useVideoThumbnailUpload` (audit P1.4 split).
	const videoThumbnail = useVideoThumbnailUpload({ startUpload });

	// Cleanup on unmount.
	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
			cancellation.abortAnyVideo();
			if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
						bytesUploaded: 0,
						bytesTotal: 0,
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
			bytesUploaded: 0,
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
	 * Update global bytes counter and per-file bytes within the active batch.
	 */
	const updateBytesUploaded = (globalBytes: number, tracker: CurrentBatchTracker) => {
		bytesUploadedRef.current = globalBytes;

		setProgress((prev) => {
			if (!prev?.files) return prev;
			const batchTotalBytes = tracker.totalBytes || 1;
			const batchUploaded = Math.max(
				0,
				Math.min(batchTotalBytes, globalBytes - tracker.startBytes),
			);
			const batchPercent = (batchUploaded / batchTotalBytes) * 100;
			const namesInBatch = new Set(tracker.files.map((f) => f.name));
			const nextFiles = prev.files.map((entry) => {
				if (!namesInBatch.has(entry.fileName)) return entry;
				if (entry.state === "done" || entry.state === "failed") return entry;
				const sharedPercent = Math.round(batchPercent);
				return {
					...entry,
					state: "uploading" as const,
					percent: sharedPercent,
					bytesUploaded: Math.round((sharedPercent / 100) * entry.sizeBytes),
				};
			});
			const next: UploadProgress = {
				...prev,
				files: nextFiles,
				bytesUploaded: globalBytes,
				bytesTotal: bytesTotalRef.current,
			};
			onProgressRef.current?.(next);
			return next;
		});
	};

	/**
	 * Light-weight pre-validation (count + MIME) — runs BEFORE compression to avoid
	 * burning CPU/battery on files that will be dropped anyway. (P1.3)
	 */
	const preValidateBasic = (files: File[]): File[] => {
		const mediaFiles = files.filter(isValidMediaType);
		if (mediaFiles.length < files.length) {
			const rejectedFiles = files.filter((f) => !isValidMediaType(f));
			// Nommer le premier fichier refusé ET le format attendu : « 1 fichier
			// ignoré / Seules les images et vidéos sont acceptées » était faux pour un
			// `.mov`, qui EST une vidéo — et laissait réessayer à l'identique.
			const first = rejectedFiles[0]!;
			const others = rejectedFiles.length - 1;
			toast.warning(
				`${rejectedFiles.length} fichier${rejectedFiles.length > 1 ? "s" : ""} ignoré${rejectedFiles.length > 1 ? "s" : ""}`,
				{
					description:
						others > 0
							? `${describeRejectedFile(first)} (+${others} autre${others > 1 ? "s" : ""})`
							: describeRejectedFile(first),
					duration: 8000,
				},
			);
		}
		if (mediaFiles.length > maxFiles) {
			toast.warning(`Maximum ${maxFiles} fichiers`, {
				description: `${mediaFiles.length - maxFiles} fichier(s) ignoré(s)`,
			});
			return mediaFiles.slice(0, maxFiles);
		}
		return mediaFiles;
	};

	/**
	 * Pre-compress image files (> 1MB) before validation/upload.
	 * Handles HEIC decode failures by surfacing a clear error and skipping the file.
	 * Emits compression progress per file (P2.2).
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
			if (cancellation.isCancelled(file.name)) {
				markFileState(file.name, "failed", "Annulé");
				continue;
			}
			if (getMediaTypeFromFile(file) === "VIDEO") {
				prepared.push(file);
				continue;
			}
			if (file.size > 1024 * 1024) {
				updateProgress({ phase: "compressing", current: file.name });
				markFileState(file.name, "compressing");
			}
			try {
				const result = await compressImage(file, {
					onProgress: (p) => {
						updateFileEntry(file.name, { percent: Math.round(p * 100) });
					},
				});
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
					if (process.env.NODE_ENV === "development") {
						console.warn("[useMediaUpload] Compression échouée:", file.name, err);
					}
					prepared.push(file);
				}
			}
		}

		return prepared;
	};

	/**
	 * Public validation API exposed via UseMediaUploadReturn.
	 * Runs full validation (MIME + size + count) — kept atomic so callers can
	 * pre-filter files outside the upload pipeline if needed.
	 */
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
				pushFailed(f, `Fichier trop volumineux (${formatBytesShort(f.size)})`);
			} else {
				validSizeFiles.push(f);
			}
		}

		if (oversized.length > 0) {
			const details = oversized
				.slice(0, 3)
				.map((f) => `${f.name} (${formatBytesShort(f.size)})`)
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

	/** Internal post-compression size check — used inside processBatch */
	const validateSizesInternal = (files: File[]): File[] => {
		const oversized: File[] = [];
		const validSizeFiles: File[] = [];
		for (const f of files) {
			if (isOversized(f)) {
				oversized.push(f);
				pushFailed(f, `Fichier trop volumineux (${formatBytesShort(f.size)})`);
			} else {
				validSizeFiles.push(f);
			}
		}
		if (oversized.length > 0) {
			const details = oversized
				.slice(0, 3)
				.map((f) => `${f.name} (${formatBytesShort(f.size)})`)
				.join(", ");
			const suffix = oversized.length > 3 ? ` et ${oversized.length - 3} autre(s)` : "";
			toast.error(`${oversized.length} fichier(s) trop volumineux`, {
				description: details + suffix,
			});
		}
		return validSizeFiles;
	};

	const uploadVideo = async (
		videoFile: File,
		signal: AbortSignal,
	): Promise<MediaUploadResult | null> => {
		const { thumbnailUrl, blurDataUrl, width, height } =
			await videoThumbnail.uploadThumbnailForVideo(videoFile, signal);

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
					width,
					height,
				};
			}

			return null;
		} catch (error) {
			if (thumbnailUrl) {
				videoThumbnail.cleanupOrphanThumbnail(thumbnailUrl);
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

		// Set up batch tracker for byte-routing the global UploadThing percent (P0.1)
		const batchTotalBytes = imageFiles.reduce((s, f) => s + f.size, 0);
		currentBatchRef.current = {
			mode: "image-batch",
			files: imageFiles,
			startBytes: bytesUploadedRef.current,
			totalBytes: batchTotalBytes,
		};

		// `catch` + rethrow au lieu de `finally` : le React Compiler ne sait pas
		// lower un TryStatement sans catch et abandonne l'optimisation du hook.
		try {
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
						width: serverData.width ?? undefined,
						height: serverData.height ?? undefined,
					});
				}
			}

			// Lock in bytes accounting at end of batch (callback may be coarse on tiny files)
			updateBytesUploaded(
				currentBatchRef.current.startBytes + batchTotalBytes,
				currentBatchRef.current,
			);

			currentBatchRef.current = null;
			return uploadResults;
		} catch (error) {
			currentBatchRef.current = null;
			throw error;
		}
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

			const batchResults = await Promise.allSettled(
				batch.map(async (file) => {
					if (cancellation.isCancelled(file.name)) {
						markFileState(file.name, "failed", "Annulé");
						return null;
					}
					// Per-video sub-abort enables cancelOne mid-flight (P1.5)
					const subAbort = new AbortController();
					cancellation.bindVideo(file.name, subAbort);
					const composite = new AbortController();
					const onParentAbort = () => composite.abort();
					const onSubAbort = () => composite.abort();
					signal.addEventListener("abort", onParentAbort);
					subAbort.signal.addEventListener("abort", onSubAbort);
					const releaseVideoBinding = () => {
						currentBatchRef.current = null;
						signal.removeEventListener("abort", onParentAbort);
						subAbort.signal.removeEventListener("abort", onSubAbort);
						cancellation.releaseVideo(file.name, subAbort);
					};
					// `catch` + rethrow au lieu de `finally` : bail-out React Compiler
					// (TryStatement sans catch) sur tout le hook.
					try {
						currentBatchRef.current = {
							mode: "video-single",
							files: [file],
							startBytes: bytesUploadedRef.current,
							totalBytes: file.size,
						};
						const r = await uploadVideo(file, composite.signal);
						updateBytesUploaded(
							currentBatchRef.current.startBytes + file.size,
							currentBatchRef.current,
						);
						releaseVideoBinding();
						return r;
					} catch (error) {
						releaseVideoBinding();
						throw error;
					}
				}),
			);

			for (let j = 0; j < batchResults.length; j++) {
				const result = batchResults[j]!;
				const file = batch[j]!;
				if (result.status === "fulfilled" && result.value) {
					results.push(result.value);
				} else if (result.status === "rejected") {
					if (result.reason instanceof DOMException && result.reason.name === "AbortError") {
						// Per-file abort = silent skip (cancelOne flow); parent abort = propagate.
						// TS narrows signal.aborted=false from L594 check; runtime can flip it after await.
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
						if (signal.aborted) throw result.reason;
						markFileState(file.name, "failed", "Annulé");
						continue;
					}
					const message =
						result.reason instanceof Error ? result.reason.message : "Échec du téléversement vidéo";
					pushFailed(file, message);
					if (process.env.NODE_ENV === "development") {
						console.warn("[useMediaUpload] Echec upload video:", result.reason);
					}
				}
			}
		}

		return results;
	};

	const processBatch = async (
		rawFiles: File[],
		signal: AbortSignal,
	): Promise<MediaUploadResult[]> => {
		// 1. Pre-validate count + MIME BEFORE compression (P1.3) — avoids burning CPU
		updateProgress({ phase: "validating" });
		const preValidated = preValidateBasic(rawFiles);
		if (preValidated.length === 0) return [];
		setFileProgressList(preValidated);

		// 2. Pre-compress images (> 1MB) and surface HEIC decode failures
		const prepared = await prepareFiles(preValidated);
		if (signal.aborted) {
			throw new DOMException("Operation annulee", "AbortError");
		}

		// 3. Validate post-compression sizes (size may differ after compression).
		// Use the internal size-only checker — preValidateBasic already handled MIME + count.
		const files = validateSizesInternal(prepared);
		if (files.length === 0) return [];

		// 4. Reconcile total based on validated count + bytes accounting (P0.1)
		const queuedFileCount = queueRef.current.reduce((sum, e) => sum + e.files.length, 0);
		const batchBytes = files.reduce((s, f) => s + f.size, 0);
		bytesTotalRef.current += batchBytes;
		updateProgress({
			total: cumulativeCompletedRef.current + files.length + queuedFileCount,
			bytesTotal: bytesTotalRef.current,
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
				// Lot 5/S4.4 : plus de mise en file hors-ligne (IndexedDB) sur échec
				// réseau — l'échec est rendu tel quel et l'admin relance depuis la
				// bannière d'erreur, qui porte déjà « Réessayer ».
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
		bytesUploadedRef.current = 0;
		bytesTotalRef.current = 0;
		cancellation.resetCancelled();

		try {
			while (queueRef.current.length > 0) {
				const entry = queueRef.current.shift()!;

				const queuedFileCount = queueRef.current.reduce((sum, e) => sum + e.files.length, 0);
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
						setProgress(null);
						isProcessingRef.current = false;
						if (keptCount > 0) {
							toast.info("Envoi annulé", {
								description: `${keptCount} fichier${keptCount > 1 ? "s" : ""} conservé${keptCount > 1 ? "s" : ""}`,
							});
						} else {
							toast.info("Envoi annulé");
						}
						return;
					}

					const err = error instanceof Error ? error : new Error(String(error));
					onErrorRef.current?.(err);
					toast.error("Échec de l'envoi", { description: err.message });
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
				bytesUploadedRef.current = 0;
				bytesTotalRef.current = 0;
			}, 1000);

			isProcessingRef.current = false;
		} catch (error) {
			// `catch` + rethrow au lieu de `finally` (bail-out React Compiler). Le
			// `return` du chemin abort ci-dessus fait déjà ce cleanup inline.
			isProcessingRef.current = false;
			throw error;
		}
	};

	const upload = (files: File[]): Promise<MediaUploadResult[]> => {
		if (files.length === 0) return Promise.resolve([]);

		return new Promise<MediaUploadResult[]>((resolve, reject) => {
			queueRef.current.push({ files, resolve, reject });

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
		cancellation.abortAnyVideo();
		abortControllerRef.current = null;
		for (const entry of queueRef.current) {
			entry.resolve([]);
		}
		queueRef.current = [];
		setProgress(null);
		cumulativeResultsRef.current = [];
		cumulativeCompletedRef.current = 0;
		bytesUploadedRef.current = 0;
		bytesTotalRef.current = 0;
		cancellation.resetCancelled();
	};

	/**
	 * Cancel a single file by name (P1.5).
	 * - File queued / not yet uploading → marked "failed: Annulé", removed from session
	 * - Single video currently uploading → sub-AbortController fires, sequential loop continues
	 * - File inside an in-flight image batch → cannot interrupt (UploadThing batch is atomic);
	 *   surfaces a toast and leaves the upload running
	 */
	const cancelOne = (fileName: string) => {
		cancellation.markCancelled(fileName);
		markFileState(fileName, "failed", "Annulé");
		if (cancellation.abortCurrentVideo(fileName)) {
			return;
		}
		const tracker = currentBatchRef.current;
		const batchInfo = tracker
			? { mode: tracker.mode, fileNames: new Set(tracker.files.map((f) => f.name)) }
			: null;
		if (cancellation.isInActiveImageBatch(fileName, batchInfo)) {
			toast.info("Impossible d'annuler", {
				description: "Ce fichier part avec d'autres. Annule l'envoi complet pour tout arrêter.",
			});
		}
	};

	const retryFailed = async (): Promise<MediaUploadResult[]> => {
		const toRetry = failedFiles.map((f) => f.file);
		if (toRetry.length === 0) return [];
		setFailedFiles([]);
		for (const f of toRetry) cancellation.clearCancelled(f.name);
		return upload(toRetry);
	};

	const retrySingle = async (file: File): Promise<MediaUploadResult | null> => {
		setFailedFiles((prev) => prev.filter((entry) => entry.file !== file));
		cancellation.clearCancelled(file.name);
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
		cancelOne,
		retryFailed,
		retrySingle,
		clearFailed,
		isUploading: isUploadThingUploading || progress !== null,
		progress,
		failedFiles,
		getMediaType: getMediaTypeFromFile,
		isOversized,
	};
}
