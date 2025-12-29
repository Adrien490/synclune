"use client";

import {
	CLIENT_THUMBNAIL_CONFIG,
	THUMBNAIL_CONFIG,
	VIDEO_EVENT_TIMEOUTS,
	FRAME_VALIDATION,
	UI_DELAYS,
} from "../constants/media.constants";
import type { VideoThumbnailOptions, VideoThumbnailResult } from "../types/hooks.types";

// Re-export types for backwards compatibility
export type { VideoThumbnailOptions, VideoThumbnailResult };

// ============================================================================
// FEATURE DETECTION
// ============================================================================

/** Cache pour la detection des features */
let _canvasSupported: boolean | null = null;
let _offscreenCanvasSupported: boolean | null = null;

/**
 * Verifie si le navigateur supporte Canvas 2D
 */
export function isThumbnailGenerationSupported(): boolean {
	if (typeof document === "undefined") return false;

	if (_canvasSupported === null) {
		try {
			const canvas = document.createElement("canvas");
			_canvasSupported = !!canvas.getContext("2d");
		} catch {
			_canvasSupported = false;
		}
	}

	return _canvasSupported;
}

/**
 * Verifie si OffscreenCanvas est supporte (plus performant)
 */
function isOffscreenCanvasSupported(): boolean {
	if (typeof OffscreenCanvas === "undefined") return false;

	if (_offscreenCanvasSupported === null) {
		try {
			const offscreen = new OffscreenCanvas(1, 1);
			_offscreenCanvasSupported = !!offscreen.getContext("2d");
		} catch {
			_offscreenCanvasSupported = false;
		}
	}

	return _offscreenCanvasSupported;
}

// ============================================================================
// CANVAS HELPERS
// ============================================================================

type CanvasType = HTMLCanvasElement | OffscreenCanvas;
type ContextType = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Cree un canvas (OffscreenCanvas si disponible, sinon HTMLCanvasElement)
 */
function createCanvas(width: number, height: number): { canvas: CanvasType; ctx: ContextType } {
	if (isOffscreenCanvasSupported()) {
		const canvas = new OffscreenCanvas(width, height);
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Impossible de creer le contexte OffscreenCanvas 2D");
		return { canvas, ctx };
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Impossible de creer le contexte Canvas 2D");
	return { canvas, ctx };
}

/**
 * Genere un blur placeholder a partir d'un canvas
 */
function generateBlurFromCanvas(
	sourceCanvas: CanvasType,
	ctx: ContextType,
	size: number = CLIENT_THUMBNAIL_CONFIG.blurSize
): string {
	const { canvas: blurCanvas, ctx: blurCtx } = createCanvas(size, size);

	// Dessiner l'image source reduite
	blurCtx.drawImage(sourceCanvas as HTMLCanvasElement, 0, 0, size, size);

	// Pour OffscreenCanvas, on doit convertir differemment
	if (blurCanvas instanceof OffscreenCanvas) {
		// Fallback: creer un canvas DOM pour toDataURL
		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = size;
		tempCanvas.height = size;
		const tempCtx = tempCanvas.getContext("2d");
		if (tempCtx) {
			tempCtx.drawImage(sourceCanvas as HTMLCanvasElement, 0, 0, size, size);
			return tempCanvas.toDataURL("image/jpeg", 0.5);
		}
	}

	return (blurCanvas as HTMLCanvasElement).toDataURL("image/jpeg", 0.5);
}

/**
 * Verifie si une frame est exploitable (pas entierement noire/blanche)
 */
function isFrameValid(ctx: ContextType, width: number, height: number): boolean {
	const sampleSize = Math.min(width, height, FRAME_VALIDATION.MAX_SAMPLE_SIZE);
	const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
	const pixels = imageData.data;

	let blackPixels = 0;
	let whitePixels = 0;
	let validPixels = 0;
	const totalSamples = Math.floor(pixels.length / FRAME_VALIDATION.SAMPLE_FACTOR);

	for (let i = 0; i < pixels.length; i += FRAME_VALIDATION.SAMPLE_FACTOR) {
		const r = pixels[i];
		const g = pixels[i + 1];
		const b = pixels[i + 2];

		if (r < FRAME_VALIDATION.BLACK_THRESHOLD && g < FRAME_VALIDATION.BLACK_THRESHOLD && b < FRAME_VALIDATION.BLACK_THRESHOLD) {
			blackPixels++;
		} else if (r > FRAME_VALIDATION.WHITE_THRESHOLD && g > FRAME_VALIDATION.WHITE_THRESHOLD && b > FRAME_VALIDATION.WHITE_THRESHOLD) {
			whitePixels++;
		} else {
			validPixels++;
		}
	}

	// Frame valide si moins de 95% noire ou blanche
	const blackRatio = blackPixels / totalSamples;
	const whiteRatio = whitePixels / totalSamples;

	return blackRatio < FRAME_VALIDATION.INVALID_PIXEL_RATIO && whiteRatio < FRAME_VALIDATION.INVALID_PIXEL_RATIO;
}

// ============================================================================
// VIDEO HELPERS
// ============================================================================

/**
 * Attend qu'un evenement video soit declenche avec gestion timeout et abort
 */
function waitForVideoEvent<K extends keyof HTMLVideoElementEventMap>(
	video: HTMLVideoElement,
	eventName: K,
	timeout: number = VIDEO_EVENT_TIMEOUTS.DEFAULT_MS,
	signal?: AbortSignal
): Promise<void> {
	return new Promise((resolve, reject) => {
		// Verifier si deja aborte
		if (signal?.aborted) {
			reject(new DOMException("Operation annulee", "AbortError"));
			return;
		}

		const cleanup = () => {
			clearTimeout(timeoutId);
			video.removeEventListener(eventName, successHandler);
			video.removeEventListener("error", errorHandler);
			signal?.removeEventListener("abort", abortHandler);
		};

		const timeoutId = setTimeout(() => {
			cleanup();
			reject(new Error(`Timeout (${timeout}ms) pour l'evenement ${eventName}`));
		}, timeout);

		const successHandler = () => {
			cleanup();
			resolve();
		};

		const errorHandler = () => {
			cleanup();
			const errorMessage = video.error?.message || video.error?.code?.toString() || "inconnue";
			reject(new Error(`Erreur video: ${errorMessage}`));
		};

		const abortHandler = () => {
			cleanup();
			reject(new DOMException("Operation annulee", "AbortError"));
		};

		video.addEventListener(eventName, successHandler, { once: true });
		video.addEventListener("error", errorHandler, { once: true });
		signal?.addEventListener("abort", abortHandler, { once: true });
	});
}

/**
 * Configure et charge une video pour extraction de frame
 */
async function loadVideo(
	videoFile: File,
	signal?: AbortSignal
): Promise<{ video: HTMLVideoElement; objectUrl: string }> {
	const video = document.createElement("video");
	const objectUrl = URL.createObjectURL(videoFile);

	// Configuration optimale pour extraction de frame
	video.preload = "auto";
	video.muted = true;
	video.playsInline = true;
	video.crossOrigin = "anonymous";

	// Desactiver la lecture automatique pour economiser les ressources
	video.autoplay = false;

	video.src = objectUrl;
	video.load();

	try {
		await waitForVideoEvent(video, "loadedmetadata", VIDEO_EVENT_TIMEOUTS.LOADED_METADATA_MS, signal);

		// Verifier les dimensions
		if (video.videoWidth === 0 || video.videoHeight === 0) {
			throw new Error(`Dimensions video invalides: ${video.videoWidth}x${video.videoHeight}`);
		}

		return { video, objectUrl };
	} catch (error) {
		URL.revokeObjectURL(objectUrl);
		throw error;
	}
}

/**
 * Capture une frame a une position donnee
 */
async function captureFrameAtPosition(
	video: HTMLVideoElement,
	position: number,
	signal?: AbortSignal
): Promise<{ canvas: CanvasType; ctx: ContextType; width: number; height: number } | null> {
	// Calculer le temps de capture
	const captureTime = Math.min(
		THUMBNAIL_CONFIG.maxCaptureTime,
		Math.max(0.1, video.duration * position)
	);

	video.currentTime = captureTime;

	try {
		await waitForVideoEvent(video, "seeked", VIDEO_EVENT_TIMEOUTS.SEEKED_MS, signal);

		// Court delai pour s'assurer que la frame est decodee
		await new Promise(resolve => setTimeout(resolve, UI_DELAYS.VIDEO_FRAME_STABILIZATION_MS));

		// Calculer les dimensions
		const aspectRatio = video.videoHeight / video.videoWidth;
		const width = CLIENT_THUMBNAIL_CONFIG.width;
		const height = Math.round(width * aspectRatio);

		// Creer le canvas et dessiner
		const { canvas, ctx } = createCanvas(width, height);
		ctx.drawImage(video, 0, 0, width, height);

		// Verifier si la frame est valide
		if (!isFrameValid(ctx, width, height)) {
			return null;
		}

		return { canvas, ctx, width, height };
	} catch {
		return null;
	}
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Genere un thumbnail a partir d'un fichier video en utilisant l'API Canvas
 *
 * Fonctionnalites:
 * - Essaie plusieurs positions de capture pour eviter les frames noires
 * - Utilise OffscreenCanvas si disponible pour de meilleures performances
 * - Supporte l'annulation via AbortSignal
 * - Genere automatiquement un blur placeholder
 *
 * @example
 * const controller = new AbortController();
 * try {
 *   const result = await generateVideoThumbnail(videoFile, { signal: controller.signal });
 *   // Upload result.thumbnailFile
 *   // Utiliser result.blurDataUrl comme placeholder
 * } finally {
 *   URL.revokeObjectURL(result.previewUrl);
 * }
 */
export async function generateVideoThumbnail(
	videoFile: File,
	options: VideoThumbnailOptions = {}
): Promise<VideoThumbnailResult> {
	const {
		width = CLIENT_THUMBNAIL_CONFIG.width,
		quality = CLIENT_THUMBNAIL_CONFIG.quality,
		capturePositions = [0.1, 0.25, 0.5, 0.75],
		maxCaptureTime = CLIENT_THUMBNAIL_CONFIG.maxCaptureTime,
		signal,
	} = options;

	// Verifier le support
	if (!isThumbnailGenerationSupported()) {
		throw new Error("Canvas 2D non supporte par ce navigateur");
	}

	// Verifier si aborte
	if (signal?.aborted) {
		throw new DOMException("Operation annulee", "AbortError");
	}

	const { video, objectUrl } = await loadVideo(videoFile, signal);

	try {
		// Essayer plusieurs positions jusqu'a trouver une frame valide
		let capturedFrame: { canvas: CanvasType; ctx: ContextType; width: number; height: number } | null = null;
		let capturedPosition = 0;

		for (const position of capturePositions) {
			if (signal?.aborted) {
				throw new DOMException("Operation annulee", "AbortError");
			}

			capturedFrame = await captureFrameAtPosition(video, position, signal);

			if (capturedFrame) {
				capturedPosition = position;
				break;
			}
		}

		// Si aucune frame valide, prendre la premiere position quand meme
		if (!capturedFrame) {
			const firstPosition = capturePositions[0] || 0.1;
			const captureTime = Math.min(maxCaptureTime, Math.max(0.1, video.duration * firstPosition));
			video.currentTime = captureTime;
			await waitForVideoEvent(video, "seeked", VIDEO_EVENT_TIMEOUTS.SEEKED_MS, signal);
			await new Promise(resolve => setTimeout(resolve, UI_DELAYS.VIDEO_FRAME_STABILIZATION_MS));

			const aspectRatio = video.videoHeight / video.videoWidth;
			const height = Math.round(width * aspectRatio);
			const { canvas, ctx } = createCanvas(width, height);
			ctx.drawImage(video, 0, 0, width, height);

			capturedFrame = { canvas, ctx, width, height };
			capturedPosition = firstPosition;
		}

		const { canvas, ctx } = capturedFrame;

		// Generer le blur placeholder
		const blurDataUrl = generateBlurFromCanvas(canvas, ctx);

		// Convertir en blob
		let blob: Blob;

		if (canvas instanceof OffscreenCanvas) {
			blob = await canvas.convertToBlob({
				type: CLIENT_THUMBNAIL_CONFIG.format,
				quality,
			});
		} else {
			blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(
					(result) => {
						if (result) resolve(result);
						else reject(new Error("Echec de la conversion du canvas en blob"));
					},
					CLIENT_THUMBNAIL_CONFIG.format,
					quality
				);
			});
		}

		// Creer le fichier thumbnail avec nom unique
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(2, 8);
		const thumbnailFile = new File(
			[blob],
			`thumb-${timestamp}-${randomSuffix}.jpg`,
			{ type: "image/jpeg" }
		);

		// Creer l'URL de preview
		const previewUrl = URL.createObjectURL(blob);

		return {
			thumbnailFile,
			previewUrl,
			blurDataUrl,
			capturedAt: capturedPosition,
		};
	} finally {
		// Cleanup: toujours revoquer l'URL de la video
		URL.revokeObjectURL(objectUrl);

		// Liberer les ressources video
		video.src = "";
		video.load();
	}
}

