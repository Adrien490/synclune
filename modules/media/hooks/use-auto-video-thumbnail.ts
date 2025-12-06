"use client";

import { useRef, useCallback, useState } from "react";
import { useUploadThing } from "@/modules/media/utils/uploadthing";
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

export interface GenerateThumbnailOptions {
	/** Position de capture en secondes (si non fourni, utilise 10% de la duree, max 1s) */
	captureTimeSeconds?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Test CORS precoce en tentant de lire un pixel du canvas
 * Permet de detecter les erreurs CORS avant de continuer le flux
 */
function testCORSAccess(video: HTMLVideoElement): void {
	const testCanvas = document.createElement("canvas");
	testCanvas.width = 1;
	testCanvas.height = 1;

	const ctx = testCanvas.getContext("2d");
	if (!ctx) return;

	try {
		ctx.drawImage(video, 0, 0, 1, 1);
		// Tenter de lire les pixels - echoue si CORS bloque
		ctx.getImageData(0, 0, 1, 1);
	} catch (error) {
		if (error instanceof Error && error.name === "SecurityError") {
			throw new CORSError(
				"Impossible d'acceder au contenu video en raison de restrictions CORS. " +
				"Verifiez que le serveur d'hebergement autorise les requetes cross-origin."
			);
		}
		throw error;
	} finally {
		testCanvas.width = 0;
		testCanvas.height = 0;
	}
}

/**
 * Capture une frame video a une taille specifique
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

		// Calcul dimensions (ratio preserve)
		const ratio = Math.min(width / video.videoWidth, height / video.videoHeight, 1);
		canvas.width = Math.round(video.videoWidth * ratio);
		canvas.height = Math.round(video.videoHeight * ratio);

		// Dessiner la frame (CORS deja teste, ne devrait pas echouer)
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		// Convertir en WebP
		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob((b) => resolve(b), "image/webp", quality);
		});

		if (blob) return blob;

		// Fallback JPEG si WebP non supporte
		const jpegBlob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
		});

		if (!jpegBlob) {
			throw new Error("Echec conversion image (WebP et JPEG)");
		}

		return jpegBlob;
	} finally {
		// Cleanup canvas pour liberer memoire
		canvas.width = 0;
		canvas.height = 0;
	}
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook pour generer automatiquement des thumbnails de video (deux tailles)
 * Sans interaction utilisateur - capture a 10% de la duree
 *
 * Ameliorations 2025:
 * - Test CORS precoce (detecte les erreurs avant le flux complet)
 * - Tracking simplifie via ref (evite les race conditions)
 * - Logging structure pour debugging
 *
 * @returns smallUrl (160px) pour miniatures galerie, mediumUrl (480px) pour poster
 */
export function useAutoVideoThumbnail(options: UseAutoVideoThumbnailOptions = {}) {
	const { startUpload } = useUploadThing("catalogMedia");
	// Ref pour le tracking interne (evite race conditions)
	const generatingUrlsRef = useRef<Set<string>>(new Set());
	// Compteur reactif pour l'UI (declenche re-render quand ca change)
	const [generatingCount, setGeneratingCount] = useState(0);

	const generateThumbnailCore = async (
		videoUrl: string,
		generateOptions?: GenerateThumbnailOptions
	): Promise<ThumbnailResult> => {
		const video = document.createElement("video");

		try {
			// 1. Configurer element video
			video.crossOrigin = "anonymous";
			video.muted = true;
			video.preload = "metadata";

			// 2. Charger la video (avec timeout)
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error("Timeout chargement video (30s)"));
				}, THUMBNAIL_CONFIG.loadTimeout);

				video.onloadedmetadata = () => {
					clearTimeout(timeout);
					resolve();
				};
				video.onerror = () => {
					clearTimeout(timeout);
					const errorMsg = video.error?.message || "Format non supporte ou URL invalide";
					reject(new Error(`Erreur chargement video: ${errorMsg}`));
				};
				video.src = videoUrl;
			});

			// 3. Seek a la position calculee
			const seekTime = generateOptions?.captureTimeSeconds !== undefined
				? Math.min(generateOptions.captureTimeSeconds, video.duration)
				: Math.min(THUMBNAIL_CONFIG.maxCaptureTime, video.duration * THUMBNAIL_CONFIG.capturePosition);
			video.currentTime = seekTime;

			await new Promise<void>((resolve) => {
				video.onseeked = () => resolve();
			});

			// 4. Attendre que la frame soit prete
			if (video.readyState < 2) {
				await new Promise<void>((resolve) => {
					video.oncanplay = () => resolve();
				});
			}

			// 5. Test CORS precoce - echoue tot si acces bloque
			testCORSAccess(video);

			// 6. Capturer les deux tailles
			const smallConfig = THUMBNAIL_CONFIG.SMALL;
			const mediumConfig = THUMBNAIL_CONFIG.MEDIUM;

			const [smallBlob, mediumBlob] = await Promise.all([
				captureFrame(video, smallConfig.width, smallConfig.height, smallConfig.quality),
				captureFrame(video, mediumConfig.width, mediumConfig.height, mediumConfig.quality),
			]);

			// 7. Upload les deux fichiers
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
			// Cleanup video pour eviter memory leak
			video.pause();
			video.src = "";
			video.load();
			video.onloadedmetadata = null;
			video.onerror = null;
			video.onseeked = null;
			video.oncanplay = null;
		}
	};

	const generateThumbnail = useCallback(async (
		videoUrl: string,
		generateOptions?: GenerateThumbnailOptions
	): Promise<ThumbnailResult> => {
		// Protection contre les appels dupliques
		if (generatingUrlsRef.current.has(videoUrl)) {
			console.warn("[useAutoVideoThumbnail] Generation deja en cours pour:", videoUrl);
			return { smallUrl: null, mediumUrl: null };
		}

		// Marquer comme en cours (ref + compteur)
		generatingUrlsRef.current.add(videoUrl);
		setGeneratingCount((c) => c + 1);

		try {
			// Utiliser withRetry pour la robustesse (sauf CORS qui echouera toujours)
			return await withRetry(() => generateThumbnailCore(videoUrl, generateOptions), {
				onRetry: (attempt, error) => {
					console.warn(`[useAutoVideoThumbnail] Retry ${attempt}:`, error.message);
				},
			});
		} catch (error) {
			const isCORSError = error instanceof CORSError;
			const errorMessage = error instanceof Error ? error.message : "Erreur generation miniature";

			// Log structure pour debugging (prepare pour Sentry)
			console.error("[useAutoVideoThumbnail] Echec generation thumbnail:", {
				videoUrl: videoUrl.substring(0, 100),
				errorType: isCORSError ? "CORS" : "GENERIC",
				message: errorMessage,
			});

			options.onError?.(errorMessage);
			return { smallUrl: null, mediumUrl: null };
		} finally {
			// Cleanup tracking (ref + compteur)
			generatingUrlsRef.current.delete(videoUrl);
			setGeneratingCount((c) => Math.max(0, c - 1));
		}
	}, [options, startUpload]);

	/**
	 * Verifie si une URL specifique est en cours de generation
	 */
	const isGenerating = useCallback((videoUrl: string): boolean => {
		return generatingUrlsRef.current.has(videoUrl);
	}, []);

	return {
		generateThumbnail,
		isGenerating,
		/** Nombre de generations en cours (pour l'UI) */
		generatingCount,
	};
}
