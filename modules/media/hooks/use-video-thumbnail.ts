"use client";

import { CLIENT_THUMBNAIL_CONFIG } from "../constants/media.constants";

// ============================================================================
// TYPES
// ============================================================================

export interface VideoThumbnailOptions {
	/** Largeur du thumbnail en pixels (defaut: 480) */
	width?: number;
	/** Qualite JPEG 0-1 (defaut: 0.8) */
	quality?: number;
	/** Position de capture en ratio de la duree (defaut: 0.1 = 10%) */
	capturePosition?: number;
	/** Temps max de capture en secondes (defaut: 1) */
	maxCaptureTime?: number;
}

export interface VideoThumbnailResult {
	/** Thumbnail sous forme de File pret pour upload */
	thumbnailFile: File;
	/** URL de preview temporaire (doit etre revoquee) */
	previewUrl: string;
	/** Blur placeholder en base64 data URL */
	blurDataUrl: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Genere un blur placeholder a partir d'un canvas
 * Reduit l'image a une petite taille puis convertit en base64
 */
function generateBlurFromCanvas(
	sourceCanvas: HTMLCanvasElement,
	size: number = CLIENT_THUMBNAIL_CONFIG.blurSize
): string {
	const blurCanvas = document.createElement("canvas");
	blurCanvas.width = size;
	blurCanvas.height = size;
	const ctx = blurCanvas.getContext("2d");

	if (!ctx) {
		return "";
	}

	// Dessiner l'image source reduite
	ctx.drawImage(sourceCanvas, 0, 0, size, size);

	// Convertir en base64 JPEG avec qualite reduite
	return blurCanvas.toDataURL("image/jpeg", 0.5);
}

/**
 * Attend qu'un evenement soit declenche sur un element
 */
function waitForEvent<K extends keyof HTMLVideoElementEventMap>(
	video: HTMLVideoElement,
	eventName: K,
	timeout: number = 10000
): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error(`Timeout en attendant l'evenement ${eventName}`));
		}, timeout);

		const handler = () => {
			clearTimeout(timeoutId);
			video.removeEventListener(eventName, handler);
			resolve();
		};

		video.addEventListener(eventName, handler);
	});
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Genere un thumbnail a partir d'un fichier video en utilisant l'API Canvas
 *
 * @example
 * const { thumbnailFile, blurDataUrl, previewUrl } = await generateVideoThumbnail(videoFile);
 * // Upload thumbnailFile
 * // Utiliser blurDataUrl comme placeholder
 * // Ne pas oublier: URL.revokeObjectURL(previewUrl)
 */
export async function generateVideoThumbnail(
	videoFile: File,
	options: VideoThumbnailOptions = {}
): Promise<VideoThumbnailResult> {
	const {
		width = CLIENT_THUMBNAIL_CONFIG.width,
		quality = CLIENT_THUMBNAIL_CONFIG.quality,
		capturePosition = CLIENT_THUMBNAIL_CONFIG.capturePosition,
		maxCaptureTime = CLIENT_THUMBNAIL_CONFIG.maxCaptureTime,
	} = options;

	// Creer les elements
	const video = document.createElement("video");
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");

	if (!ctx) {
		throw new Error("Canvas 2D non supporte par ce navigateur");
	}

	// Configurer la video
	video.preload = "metadata";
	video.muted = true;
	video.playsInline = true;

	// Creer l'URL temporaire pour la video
	const videoObjectUrl = URL.createObjectURL(videoFile);

	try {
		// Charger la video
		video.src = videoObjectUrl;

		// Attendre que les metadonnees soient chargees
		await waitForEvent(video, "loadedmetadata");

		// Calculer le temps de capture
		// Position = min(maxCaptureTime, duration * capturePosition)
		const captureTime = Math.min(
			maxCaptureTime,
			Math.max(0.1, video.duration * capturePosition)
		);

		// Aller a la position de capture
		video.currentTime = captureTime;

		// Attendre que la video soit positionnee
		await waitForEvent(video, "seeked");

		// Calculer les dimensions du canvas (garder le ratio)
		const aspectRatio = video.videoHeight / video.videoWidth;
		canvas.width = width;
		canvas.height = Math.round(width * aspectRatio);

		// Dessiner la frame sur le canvas
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		// Generer le blur placeholder
		const blurDataUrl = generateBlurFromCanvas(canvas);

		// Convertir en blob JPEG
		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(result) => {
					if (result) {
						resolve(result);
					} else {
						reject(new Error("Echec de la conversion du canvas en blob"));
					}
				},
				CLIENT_THUMBNAIL_CONFIG.format,
				quality
			);
		});

		// Creer le fichier thumbnail
		const timestamp = Date.now();
		const thumbnailFile = new File(
			[blob],
			`thumb-${timestamp}.jpg`,
			{ type: "image/jpeg" }
		);

		// Creer l'URL de preview
		const previewUrl = URL.createObjectURL(blob);

		return {
			thumbnailFile,
			previewUrl,
			blurDataUrl,
		};
	} finally {
		// Cleanup: revoquer l'URL de la video
		URL.revokeObjectURL(videoObjectUrl);
	}
}

/**
 * Verifie si le navigateur supporte la generation de thumbnails
 */
export function isThumbnailGenerationSupported(): boolean {
	if (typeof document === "undefined") return false;

	const canvas = document.createElement("canvas");
	return !!canvas.getContext("2d");
}
