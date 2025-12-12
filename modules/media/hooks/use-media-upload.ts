"use client";

import { useUploadThing } from "@/modules/media/utils/uploadthing";
import { toast } from "sonner";
import {
	generateVideoThumbnail,
	isThumbnailGenerationSupported,
} from "./use-video-thumbnail";

// ============================================================================
// TYPES
// ============================================================================

export interface UseMediaUploadOptions {
	/** Taille max pour les images en bytes (defaut: 16MB) */
	maxSizeImage?: number;
	/** Taille max pour les videos en bytes (defaut: 512MB) */
	maxSizeVideo?: number;
	/** Nombre max de fichiers (defaut: 10) */
	maxFiles?: number;
	/** Callback appele apres un upload reussi */
	onSuccess?: (urls: string[]) => void;
	/** Callback appele en cas d'erreur */
	onError?: (error: Error) => void;
}

export interface MediaUploadResult {
	url: string;
	mediaType: "IMAGE" | "VIDEO";
	fileName: string;
	blurDataUrl?: string;
	thumbnailUrl?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MAX_SIZE_IMAGE = 16 * 1024 * 1024; // 16MB
const DEFAULT_MAX_SIZE_VIDEO = 512 * 1024 * 1024; // 512MB
const DEFAULT_MAX_FILES = 10;

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook pour gerer l'upload de medias (images et videos) avec validation
 * Centralise la logique d'upload pour eviter la duplication dans les formulaires
 *
 * Pour les videos:
 * - Genere automatiquement un thumbnail cote client (Canvas API)
 * - Upload le thumbnail puis la video
 * - Retourne les deux URLs liees
 *
 * @example
 * const { upload, isUploading, validateFiles } = useMediaUpload({
 *   maxFiles: 5,
 *   onSuccess: (urls) => console.log('Uploaded:', urls),
 * });
 *
 * const handleFiles = async (files: File[]) => {
 *   const results = await upload(files);
 *   // results contient les URLs des fichiers uploades
 * };
 */
export function useMediaUpload(options: UseMediaUploadOptions = {}) {
	const {
		maxSizeImage = DEFAULT_MAX_SIZE_IMAGE,
		maxSizeVideo = DEFAULT_MAX_SIZE_VIDEO,
		maxFiles = DEFAULT_MAX_FILES,
	} = options;

	const { startUpload, isUploading } = useUploadThing("catalogMedia");

	/**
	 * Determine le type de media a partir du type MIME du fichier
	 */
	const getMediaType = (file: File): "IMAGE" | "VIDEO" => {
		return file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
	};

	/**
	 * Verifie si un fichier depasse la limite de taille
	 */
	const isOversized = (file: File): boolean => {
		const maxSize = getMediaType(file) === "VIDEO" ? maxSizeVideo : maxSizeImage;
		return file.size > maxSize;
	};

	/**
	 * Formate la taille d'un fichier en MB
	 */
	const formatSize = (bytes: number): string => {
		return (bytes / 1024 / 1024).toFixed(2);
	};

	/**
	 * Valide et filtre les fichiers avant upload
	 * Affiche des toasts d'erreur pour les fichiers invalides
	 *
	 * @returns Liste des fichiers valides
	 */
	const validateFiles = (files: File[]): File[] => {
		// Verifier les fichiers trop gros
		const oversized = files.filter(isOversized);
		const validSizeFiles = files.filter((f) => !isOversized(f));

		if (oversized.length > 0) {
			const details = oversized
				.map((f) => `${f.name}: ${formatSize(f.size)}MB`)
				.join(", ");
			toast.error(
				`${oversized.length} fichier(s) depassent la limite de taille`,
				{ description: details }
			);
		}

		// Verifier le nombre de fichiers
		if (validSizeFiles.length > maxFiles) {
			toast.warning(
				`Maximum ${maxFiles} fichiers autorises`,
				{
					description: `${validSizeFiles.length - maxFiles} fichier(s) ignore(s)`,
				}
			);
			return validSizeFiles.slice(0, maxFiles);
		}

		return validSizeFiles;
	};

	/**
	 * Upload une video avec generation de thumbnail cote client
	 */
	const uploadVideo = async (videoFile: File): Promise<MediaUploadResult | null> => {
		let thumbnailUrl: string | undefined;
		let blurDataUrl: string | undefined;
		let previewUrlToRevoke: string | undefined;

		// 1. Generer le thumbnail cote client si supporte
		if (isThumbnailGenerationSupported()) {
			try {
				const thumbnailResult = await generateVideoThumbnail(videoFile);
				previewUrlToRevoke = thumbnailResult.previewUrl;
				blurDataUrl = thumbnailResult.blurDataUrl;

				// 2. Upload le thumbnail
				const thumbUploadResult = await startUpload([thumbnailResult.thumbnailFile]);
				if (thumbUploadResult?.[0]?.serverData?.url) {
					thumbnailUrl = thumbUploadResult[0].serverData.url;
				}
			} catch (error) {
				console.warn(
					"[useMediaUpload] Echec generation thumbnail, upload video sans thumbnail:",
					error instanceof Error ? error.message : error
				);
			} finally {
				// Cleanup preview URL
				if (previewUrlToRevoke) {
					URL.revokeObjectURL(previewUrlToRevoke);
				}
			}
		}

		// 3. Upload la video
		try {
			const videoUploadResult = await startUpload([videoFile]);
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
		} catch (error) {
			throw error;
		}

		return null;
	};

	/**
	 * Upload une image (le serveur genere le blur)
	 */
	const uploadImage = async (imageFile: File): Promise<MediaUploadResult | null> => {
		const results = await startUpload([imageFile]);
		const serverData = results?.[0]?.serverData;

		if (serverData?.url) {
			return {
				url: serverData.url,
				mediaType: "IMAGE",
				fileName: imageFile.name,
				blurDataUrl: serverData.blurDataUrl ?? undefined,
			};
		}

		return null;
	};

	/**
	 * Upload les fichiers vers UploadThing
	 * Valide automatiquement les fichiers avant upload
	 * Pour les videos, genere un thumbnail cote client avant upload
	 *
	 * @returns Liste des resultats d'upload avec URLs et types
	 */
	const upload = async (files: File[]): Promise<MediaUploadResult[]> => {
		const validFiles = validateFiles(files);
		if (validFiles.length === 0) return [];

		const uploadResults: MediaUploadResult[] = [];

		try {
			// Separer images et videos pour traitement different
			const images = validFiles.filter((f) => getMediaType(f) === "IMAGE");
			const videos = validFiles.filter((f) => getMediaType(f) === "VIDEO");

			// Upload des images en batch (plus rapide)
			if (images.length > 0) {
				const imageResults = await startUpload(images);
				imageResults?.forEach((result, index) => {
					const serverData = result.serverData;
					if (serverData?.url) {
						uploadResults.push({
							url: serverData.url,
							mediaType: "IMAGE",
							fileName: images[index].name,
							blurDataUrl: serverData.blurDataUrl ?? undefined,
						});
					}
				});
			}

			// Upload des videos une par une (generation thumbnail)
			for (const videoFile of videos) {
				const result = await uploadVideo(videoFile);
				if (result) {
					uploadResults.push(result);
				}
			}

			options.onSuccess?.(uploadResults.map((r) => r.url));
			return uploadResults;
		} catch (error) {
			const err = error as Error;
			options.onError?.(err);
			toast.error("Echec de l'upload", {
				description: err.message,
				action: {
					label: "Reessayer",
					onClick: () => upload(validFiles),
				},
			});
			return [];
		}
	};

	/**
	 * Upload un seul fichier (convenience method)
	 */
	const uploadSingle = async (file: File): Promise<MediaUploadResult | null> => {
		const results = await upload([file]);
		return results[0] || null;
	};

	return {
		/** Upload plusieurs fichiers avec validation */
		upload,
		/** Upload un seul fichier */
		uploadSingle,
		/** Valider des fichiers sans les uploader */
		validateFiles,
		/** Indique si un upload est en cours */
		isUploading,
		/** Utilitaire pour determiner le type de media */
		getMediaType,
		/** Utilitaire pour verifier si un fichier est trop gros */
		isOversized,
	};
}
