"use client";

import { useCallback } from "react";
import { useUploadThing } from "@/modules/medias/utils/uploadthing";

// ============================================================================
// TYPES
// ============================================================================

export interface UseAutoVideoThumbnailOptions {
	onError?: (error: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_SIZE = 640;
const QUALITY = 0.85;
const THUMBNAIL_POSITION = 0.1; // 10% de la durée

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook pour générer automatiquement une thumbnail de vidéo
 * Sans interaction utilisateur - capture à 10% de la durée
 */
export function useAutoVideoThumbnail(
	options: UseAutoVideoThumbnailOptions = {}
) {
	const { startUpload } = useUploadThing("catalogMedia");

	const generateThumbnail = useCallback(
		async (videoUrl: string): Promise<string | null> => {
			try {
				// 1. Créer élément vidéo caché
				const video = document.createElement("video");
				video.crossOrigin = "anonymous";
				video.muted = true;
				video.preload = "metadata";

				// 2. Charger la vidéo (avec timeout)
				await new Promise<void>((resolve, reject) => {
					const timeout = setTimeout(() => {
						reject(new Error("Timeout chargement vidéo"));
					}, 15000);

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

				// 3. Seek à 10% de la durée (évite frames noires du début)
				const seekTime = Math.min(1, video.duration * THUMBNAIL_POSITION);
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

				// 5. Capturer via Canvas
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");

				if (!ctx) {
					throw new Error("Canvas 2D non disponible");
				}

				// Calcul dimensions (ratio préservé)
				const ratio = Math.min(
					MAX_SIZE / video.videoWidth,
					MAX_SIZE / video.videoHeight,
					1
				);
				canvas.width = Math.round(video.videoWidth * ratio);
				canvas.height = Math.round(video.videoHeight * ratio);

				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

				// 6. Convertir en Blob WebP
				const blob = await new Promise<Blob | null>((resolve) => {
					canvas.toBlob((b) => resolve(b), "image/webp", QUALITY);
				});

				if (!blob) {
					// Fallback JPEG si WebP non supporté
					const jpegBlob = await new Promise<Blob | null>((resolve) => {
						canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
					});
					if (!jpegBlob) {
						throw new Error("Échec conversion image");
					}
					const file = new File([jpegBlob], `thumb-${Date.now()}.jpg`, {
						type: "image/jpeg",
					});
					const result = await startUpload([file]);
					return result?.[0]?.ufsUrl || null;
				}

				// 7. Upload sur UploadThing
				const file = new File([blob], `thumb-${Date.now()}.webp`, {
					type: "image/webp",
				});
				const result = await startUpload([file]);

				// Cleanup
				canvas.width = 0;
				canvas.height = 0;

				return result?.[0]?.ufsUrl || null;
			} catch (error) {
				const msg =
					error instanceof Error
						? error.message
						: "Erreur génération miniature";
				options.onError?.(msg);
				return null;
			}
		},
		[startUpload, options]
	);

	return { generateThumbnail };
}
