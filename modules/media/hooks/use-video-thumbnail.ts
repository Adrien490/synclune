"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useUploadThing } from "@/modules/medias/utils/uploadthing";
import { THUMBNAIL_CONFIG } from "../constants/media.constants";

// ============================================================================
// TYPES
// ============================================================================

export interface ThumbnailGenerationState {
	isLoading: boolean;
	isGenerating: boolean;
	isUploading: boolean;
	error: string | null;
	thumbnailUrl: string | null;
	previewUrl: string | null;
	duration: number;
	currentTime: number;
	uploadProgress: number;
}

export interface UseVideoThumbnailOptions {
	quality?: number;
	maxWidth?: number;
	maxHeight?: number;
	format?: "webp" | "jpeg";
	onThumbnailGenerated?: (url: string) => void;
	onError?: (error: string) => void;
}

export interface UseVideoThumbnailReturn {
	state: ThumbnailGenerationState;
	videoRef: React.RefObject<HTMLVideoElement | null>;
	loadVideo: (url: string) => Promise<void>;
	seekTo: (time: number) => void;
	captureFrame: () => Promise<Blob | null>;
	generateAndUpload: () => Promise<string | null>;
	reset: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: Required<UseVideoThumbnailOptions> = {
	quality: THUMBNAIL_CONFIG.MEDIUM.quality,
	maxWidth: THUMBNAIL_CONFIG.MEDIUM.width,
	maxHeight: THUMBNAIL_CONFIG.MEDIUM.height,
	format: THUMBNAIL_CONFIG.MEDIUM.format,
	onThumbnailGenerated: () => {},
	onError: () => {},
};

// Extensions vidéo supportées pour validation
const SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi"] as const;

const INITIAL_STATE: ThumbnailGenerationState = {
	isLoading: false,
	isGenerating: false,
	isUploading: false,
	error: null,
	thumbnailUrl: null,
	previewUrl: null,
	duration: 0,
	currentTime: 0,
	uploadProgress: 0,
};

// ============================================================================
// HELPERS
// ============================================================================

function calculateDimensions(
	srcWidth: number,
	srcHeight: number,
	maxWidth: number,
	maxHeight: number
): { width: number; height: number } {
	const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight, 1);
	return {
		width: Math.round(srcWidth * ratio),
		height: Math.round(srcHeight * ratio),
	};
}

function getVideoErrorMessage(error: MediaError | null): string {
	if (!error) return "Erreur vidéo inconnue";

	// Inclure le message du navigateur si disponible
	const browserMsg = error.message ? ` (${error.message})` : "";

	switch (error.code) {
		case MediaError.MEDIA_ERR_ABORTED:
			return `Chargement vidéo annulé${browserMsg}`;
		case MediaError.MEDIA_ERR_NETWORK:
			return `Erreur réseau lors du chargement de la vidéo${browserMsg}`;
		case MediaError.MEDIA_ERR_DECODE:
			return `Format vidéo non supporté ou fichier corrompu${browserMsg}`;
		case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
			return `Format vidéo non supporté par le navigateur${browserMsg}`;
		default:
			return `Erreur vidéo inconnue${browserMsg}`;
	}
}

/**
 * Vérifie si le navigateur peut lire le format vidéo
 * Note: Les URLs UploadThing (utfs.io, uploadthing.com) n'ont pas d'extension,
 * on les laisse passer et le navigateur gère les erreurs.
 */
function canPlayVideoFormat(url: string): { supported: boolean; message?: string } {
	// URLs UploadThing sans extension - laisser le navigateur décider
	if (url.includes("utfs.io") || url.includes("uploadthing.com") || url.includes("ufs.sh")) {
		return { supported: true };
	}

	// Extraire l'extension depuis le chemin (ignorer query params)
	const pathname = new URL(url, "https://example.com").pathname;
	const ext = pathname.split(".").pop()?.toLowerCase();

	// Pas d'extension ou extension très longue (probablement un ID, pas une extension)
	if (!ext || ext.length > 10) {
		return { supported: true }; // Laisser le navigateur décider
	}

	// Vérifier si c'est une extension supportée
	const isKnownExt = SUPPORTED_VIDEO_EXTENSIONS.some((e) =>
		e.slice(1) === ext
	);
	if (!isKnownExt) {
		// Extension inconnue mais courte - probablement un vrai format non supporté
		// Vérifier si c'est vraiment une extension vidéo connue
		const knownVideoExtensions = ["mp4", "webm", "mov", "avi", "mkv", "flv", "wmv", "m4v", "3gp"];
		const knownImageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"];

		if (knownImageExtensions.includes(ext)) {
			return {
				supported: false,
				message: `Ce fichier est une image (.${ext}), pas une vidéo`,
			};
		}

		// Extension inconnue - laisser le navigateur essayer
		if (!knownVideoExtensions.includes(ext)) {
			return { supported: true };
		}

		return {
			supported: false,
			message: `Extension .${ext} non supportée. Formats acceptés : ${SUPPORTED_VIDEO_EXTENSIONS.join(", ")}`,
		};
	}

	// Vérifier le support navigateur
	const video = document.createElement("video");
	const mimeTypes: Record<string, string> = {
		mp4: 'video/mp4; codecs="avc1.42E01E"',
		webm: 'video/webm; codecs="vp8, vorbis"',
		mov: "video/quicktime",
		avi: "video/x-msvideo",
	};

	const mimeType = mimeTypes[ext];
	if (mimeType && video.canPlayType(mimeType) === "") {
		return {
			supported: false,
			message: `Format .${ext} non supporté par votre navigateur`,
		};
	}

	return { supported: true };
}

// ============================================================================
// HOOK
// ============================================================================

export function useVideoThumbnail(
	options: UseVideoThumbnailOptions = {}
): UseVideoThumbnailReturn {
	// Mémoriser les options pour éviter les re-renders infinis
	const opts = useMemo(
		() => ({ ...DEFAULT_OPTIONS, ...options }),
		[
			options.quality,
			options.maxWidth,
			options.maxHeight,
			options.format,
			options.onThumbnailGenerated,
			options.onError,
		]
	);

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const previewUrlRef = useRef<string | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [state, setState] = useState<ThumbnailGenerationState>(INITIAL_STATE);

	const { startUpload, isUploading } = useUploadThing("catalogMedia", {
		onUploadProgress: (progress) => {
			setState((s) => ({ ...s, uploadProgress: progress }));
		},
	});

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			// Cleanup preview URL
			if (previewUrlRef.current) {
				URL.revokeObjectURL(previewUrlRef.current);
			}
			// Cleanup canvas (memory leak fix)
			if (canvasRef.current) {
				canvasRef.current.width = 0;
				canvasRef.current.height = 0;
				canvasRef.current = null;
			}
			// Cleanup video element (memory leak fix)
			if (videoRef.current) {
				videoRef.current.pause();
				videoRef.current.src = "";
				videoRef.current.load();
			}
			// Abort pending loads
			abortControllerRef.current?.abort();
			// Clear timeout
			if (loadTimeoutRef.current) {
				clearTimeout(loadTimeoutRef.current);
			}
		};
	}, []);

	// Charger la vidéo
	const loadVideo = useCallback(async (url: string): Promise<void> => {
		// Annuler les chargements précédents (évite les race conditions)
		abortControllerRef.current?.abort();
		abortControllerRef.current = new AbortController();
		const abortSignal = abortControllerRef.current.signal;

		// Clear any existing timeout
		if (loadTimeoutRef.current) {
			clearTimeout(loadTimeoutRef.current);
			loadTimeoutRef.current = null;
		}

		const video = videoRef.current;
		if (!video) {
			setState((s) => ({ ...s, error: "Élément vidéo non disponible" }));
			return;
		}

		// Valider le format vidéo avant de charger
		const formatCheck = canPlayVideoFormat(url);
		if (!formatCheck.supported) {
			setState((s) => ({
				...s,
				isLoading: false,
				error: formatCheck.message || "Format vidéo non supporté",
			}));
			opts.onError(formatCheck.message || "Format vidéo non supporté");
			return;
		}

		setState((s) => ({ ...s, isLoading: true, error: null }));

		return new Promise((resolve, reject) => {
			let isAborted = false;

			const handleAbort = () => {
				isAborted = true;
				cleanup();
				reject(new Error("Chargement annulé"));
			};

			const handleLoadedMetadata = () => {
				if (isAborted) return;

				// Clear timeout on success
				if (loadTimeoutRef.current) {
					clearTimeout(loadTimeoutRef.current);
					loadTimeoutRef.current = null;
				}

				const initialTime = Math.min(
					THUMBNAIL_CONFIG.maxCaptureTime,
					video.duration * THUMBNAIL_CONFIG.capturePosition
				);
				setState((s) => ({
					...s,
					isLoading: false,
					duration: video.duration,
					currentTime: initialTime,
				}));
				// Seek to initial position
				video.currentTime = initialTime;
				cleanup();
				resolve();
			};

			const handleError = () => {
				if (isAborted) return;

				// Clear timeout on error
				if (loadTimeoutRef.current) {
					clearTimeout(loadTimeoutRef.current);
					loadTimeoutRef.current = null;
				}

				const errorMsg = getVideoErrorMessage(video.error);
				setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
				cleanup();
				reject(new Error(errorMsg));
			};

			const handleTimeout = () => {
				if (isAborted) return;
				isAborted = true;
				const timeoutSec = Math.round(THUMBNAIL_CONFIG.loadTimeout / 1000);
				const errorMsg = `Délai d'attente dépassé pour le chargement de la vidéo (${timeoutSec}s)`;
				setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
				cleanup();
				reject(new Error(errorMsg));
			};

			const cleanup = () => {
				video.removeEventListener("loadedmetadata", handleLoadedMetadata);
				video.removeEventListener("error", handleError);
				abortSignal.removeEventListener("abort", handleAbort);
			};

			// Setup event listeners
			video.addEventListener("loadedmetadata", handleLoadedMetadata);
			video.addEventListener("error", handleError);
			abortSignal.addEventListener("abort", handleAbort);

			// Setup timeout
			loadTimeoutRef.current = setTimeout(handleTimeout, THUMBNAIL_CONFIG.loadTimeout);

			// Configurer la vidéo
			video.crossOrigin = "anonymous";
			video.preload = "metadata";
			video.src = url;
		});
	}, [opts]);

	// Seek à un moment précis
	const seekTo = useCallback((time: number): void => {
		const video = videoRef.current;
		if (!video || !video.duration) return;

		const clampedTime = Math.max(0, Math.min(time, video.duration));
		video.currentTime = clampedTime;
		setState((s) => ({ ...s, currentTime: clampedTime }));
	}, []);

	// Capturer la frame actuelle
	const captureFrame = useCallback(async (): Promise<Blob | null> => {
		const video = videoRef.current;
		if (!video || video.readyState < 2) {
			setState((s) => ({ ...s, error: "Vidéo non prête pour la capture" }));
			return null;
		}

		// Valider les dimensions vidéo
		if (video.videoWidth === 0 || video.videoHeight === 0) {
			setState((s) => ({
				...s,
				error: "Les dimensions vidéo ne sont pas disponibles",
			}));
			return null;
		}

		setState((s) => ({ ...s, isGenerating: true, error: null }));

		try {
			// Créer ou réutiliser le canvas
			if (!canvasRef.current) {
				canvasRef.current = document.createElement("canvas");
			}
			const canvas = canvasRef.current;
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				throw new Error("Impossible de créer le contexte 2D du canvas");
			}

			// Calculer les dimensions (ratio préservé)
			const { width, height } = calculateDimensions(
				video.videoWidth,
				video.videoHeight,
				opts.maxWidth,
				opts.maxHeight
			);

			canvas.width = width;
			canvas.height = height;

			// Dessiner la frame avec détection d'erreur CORS
			try {
				ctx.drawImage(video, 0, 0, width, height);
			} catch (drawError) {
				// SecurityError = problème CORS
				if (drawError instanceof Error && drawError.name === "SecurityError") {
					throw new Error(
						"Erreur CORS : Impossible d'accéder à la vidéo en raison de restrictions cross-origin. " +
						"Vérifiez que le serveur autorise les requêtes CORS."
					);
				}
				throw drawError;
			}

			// Convertir en Blob
			const mimeType = opts.format === "webp" ? "image/webp" : "image/jpeg";
			const blob = await new Promise<Blob | null>((resolve) => {
				canvas.toBlob((b) => resolve(b), mimeType, opts.quality);
			});

			if (!blob) {
				// Fallback vers JPEG si WebP échoue
				if (opts.format === "webp") {
					console.warn("[useVideoThumbnail] WebP non supporté, fallback JPEG");
					const jpegBlob = await new Promise<Blob | null>((resolve) => {
						canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
					});
					if (!jpegBlob) {
						throw new Error("Échec de la conversion en image (WebP et JPEG)");
					}
					return jpegBlob;
				}
				throw new Error("Échec de la conversion en image");
			}

			// Cleanup old preview URL
			if (previewUrlRef.current) {
				URL.revokeObjectURL(previewUrlRef.current);
			}

			// Créer preview URL
			const previewUrl = URL.createObjectURL(blob);
			previewUrlRef.current = previewUrl;

			setState((s) => ({
				...s,
				isGenerating: false,
				previewUrl,
				error: null,
			}));

			return blob;
		} catch (error) {
			const msg =
				error instanceof Error ? error.message : "Erreur lors de la capture";
			setState((s) => ({ ...s, isGenerating: false, error: msg }));
			opts.onError(msg);
			return null;
		}
	}, [opts]);

	// Générer et uploader la miniature
	const generateAndUpload = useCallback(async (): Promise<string | null> => {
		const blob = await captureFrame();
		if (!blob) return null;

		setState((s) => ({ ...s, isUploading: true, error: null, uploadProgress: 0 }));

		try {
			// Convertir Blob en File pour UploadThing
			const extension = opts.format === "webp" ? "webp" : "jpg";
			const fileName = `thumbnail-${Date.now()}.${extension}`;
			const file = new File([blob], fileName, {
				type: opts.format === "webp" ? "image/webp" : "image/jpeg",
			});

			const result = await startUpload([file]);
			const thumbnailUrl = result?.[0]?.ufsUrl;

			if (!thumbnailUrl) {
				throw new Error("Échec de l'upload de la miniature");
			}

			setState((s) => ({
				...s,
				isUploading: false,
				thumbnailUrl,
				error: null,
			}));

			opts.onThumbnailGenerated(thumbnailUrl);
			return thumbnailUrl;
		} catch (error) {
			const msg =
				error instanceof Error ? error.message : "Erreur lors de l'upload";
			setState((s) => ({ ...s, isUploading: false, error: msg }));
			opts.onError(msg);
			return null;
		}
	}, [captureFrame, startUpload, opts]);

	// Reset
	const reset = useCallback(() => {
		// Cleanup preview URL
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
			previewUrlRef.current = null;
		}

		setState(INITIAL_STATE);
	}, []);

	return {
		state: { ...state, isUploading: state.isUploading || isUploading },
		videoRef,
		loadVideo,
		seekTo,
		captureFrame,
		generateAndUpload,
		reset,
	};
}
