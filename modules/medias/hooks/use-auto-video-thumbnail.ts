"use client";

import { useCallback, useRef, useState } from "react";
import { useUploadThing } from "@/modules/medias/utils/uploadthing";
import { THUMBNAIL_CONFIG } from "../constants/media.constants";
import { withRetry, CORSError } from "../utils/retry";

// ============================================================================
// TYPES
// ============================================================================

export interface UseAutoVideoThumbnailOptions {
	onError?: (error: string) => void;
}

export interface ThumbnailResult {
	smallUrl: string | null;
	mediumUrl: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Capture une frame vidéo à une taille spécifique
 */
async function captureFrame(
	video: HTMLVideoElement,
	width: number,
	height: number,
	quality: number
): Promise<Blob> {
	const canvas = document.createElement("canvas");

	try {
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Canvas 2D non disponible");
		}

		// Calcul dimensions (ratio préservé)
		const ratio = Math.min(width / video.videoWidth, height / video.videoHeight, 1);
		canvas.width = Math.round(video.videoWidth * ratio);
		canvas.height = Math.round(video.videoHeight * ratio);

		// Dessiner la frame (peut échouer sur CORS)
		try {
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		} catch (error) {
			if (error instanceof Error && error.name === "SecurityError") {
				throw new CORSError("Impossible d'accéder au contenu vidéo (CORS)");
			}
			throw error;
		}

		// Convertir en WebP
		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob((b) => resolve(b), "image/webp", quality);
		});

		if (blob) return blob;

		// Fallback JPEG si WebP non supporté
		const jpegBlob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
		});

		if (!jpegBlob) {
			throw new Error("Échec conversion image");
		}

		return jpegBlob;
	} finally {
		// Cleanup canvas pour libérer mémoire
		canvas.width = 0;
		canvas.height = 0;
	}
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook pour générer automatiquement des thumbnails de vidéo (deux tailles)
 * Sans interaction utilisateur - capture à 10% de la durée
 *
 * @returns smallUrl (160px) pour miniatures galerie, mediumUrl (480px) pour poster
 */
export function useAutoVideoThumbnail(options: UseAutoVideoThumbnailOptions = {}) {
	const { startUpload } = useUploadThing("catalogMedia");
	const [generatingUrls, setGeneratingUrls] = useState<Set<string>>(new Set());
	// Ref pour éviter les race conditions (state peut être stale dans useCallback)
	const generatingUrlsRef = useRef<Set<string>>(new Set());

	const generateThumbnailCore = useCallback(
		async (videoUrl: string): Promise<ThumbnailResult> => {
			const video = document.createElement("video");

			try {
				// 1. Configurer élément vidéo
				video.crossOrigin = "anonymous";
				video.muted = true;
				video.preload = "metadata";

				// 2. Charger la vidéo (avec timeout)
				await new Promise<void>((resolve, reject) => {
					const timeout = setTimeout(() => {
						reject(new Error("Timeout chargement vidéo"));
					}, THUMBNAIL_CONFIG.loadTimeout);

					video.onloadedmetadata = () => {
						clearTimeout(timeout);
						resolve();
					};
					video.onerror = () => {
						clearTimeout(timeout);
						reject(new Error("Erreur chargement vidéo"));
					};
					video.src = videoUrl;
				});

				// 3. Seek à la position calculée (10% de la durée, max 1s)
				const seekTime = Math.min(
					THUMBNAIL_CONFIG.maxCaptureTime,
					video.duration * THUMBNAIL_CONFIG.capturePosition
				);
				video.currentTime = seekTime;

				await new Promise<void>((resolve) => {
					video.onseeked = () => resolve();
				});

				// 4. Attendre que la frame soit prête
				if (video.readyState < 2) {
					await new Promise<void>((resolve) => {
						video.oncanplay = () => resolve();
					});
				}

				// 5. Capturer les deux tailles
				const smallConfig = THUMBNAIL_CONFIG.SMALL;
				const mediumConfig = THUMBNAIL_CONFIG.MEDIUM;

				const [smallBlob, mediumBlob] = await Promise.all([
					captureFrame(video, smallConfig.width, smallConfig.height, smallConfig.quality),
					captureFrame(video, mediumConfig.width, mediumConfig.height, mediumConfig.quality),
				]);

				// 6. Upload les deux fichiers
				const timestamp = Date.now();
				const smallFile = new File(
					[smallBlob],
					`thumb-small-${timestamp}.webp`,
					{ type: smallBlob.type }
				);
				const mediumFile = new File(
					[mediumBlob],
					`thumb-medium-${timestamp}.webp`,
					{ type: mediumBlob.type }
				);

				const results = await startUpload([smallFile, mediumFile]);

				return {
					smallUrl: results?.[0]?.ufsUrl || null,
					mediumUrl: results?.[1]?.ufsUrl || null,
				};
			} finally {
				// Cleanup vidéo pour éviter memory leak
				video.pause();
				video.src = "";
				video.load();
				video.onloadedmetadata = null;
				video.onerror = null;
				video.onseeked = null;
				video.oncanplay = null;
			}
		},
		[startUpload]
	);

	const generateThumbnail = useCallback(
		async (videoUrl: string): Promise<ThumbnailResult> => {
			// Protection contre les appels dupliqués (race condition)
			if (generatingUrlsRef.current.has(videoUrl)) {
				return { smallUrl: null, mediumUrl: null };
			}

			// Marquer comme en cours (ref + state)
			generatingUrlsRef.current.add(videoUrl);
			setGeneratingUrls((prev) => new Set(prev).add(videoUrl));

			try {
				// Utiliser withRetry pour la robustesse (sauf CORS qui échouera toujours)
				return await withRetry(() => generateThumbnailCore(videoUrl), {
					onRetry: (attempt, error) => {
						// console.log(`Tentative ${attempt} échouée: ${error.message}`);
					},
				});
			} catch (error) {
				const msg =
					error instanceof CORSError
						? error.message
						: error instanceof Error
							? error.message
							: "Erreur génération miniature";
				options.onError?.(msg);
				return { smallUrl: null, mediumUrl: null };
			} finally {
				// Cleanup ref + state
				generatingUrlsRef.current.delete(videoUrl);
				setGeneratingUrls((prev) => {
					const next = new Set(prev);
					next.delete(videoUrl);
					return next;
				});
			}
		},
		[generateThumbnailCore, options]
	);

	return { generateThumbnail, generatingUrls };
}
