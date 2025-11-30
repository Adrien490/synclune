"use client";

import { useUploadThing } from "@/modules/medias/utils/uploadthing";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

export interface UseMediaUploadOptions {
	/** Taille max pour les images en bytes (défaut: 4MB) */
	maxSizeImage?: number;
	/** Taille max pour les vidéos en bytes (défaut: 512MB) */
	maxSizeVideo?: number;
	/** Nombre max de fichiers (défaut: 10) */
	maxFiles?: number;
	/** Callback appelé après un upload réussi */
	onSuccess?: (urls: string[]) => void;
	/** Callback appelé en cas d'erreur */
	onError?: (error: Error) => void;
}

export interface MediaUploadResult {
	url: string;
	mediaType: "IMAGE" | "VIDEO";
	fileName: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MAX_SIZE_IMAGE = 4 * 1024 * 1024; // 4MB
const DEFAULT_MAX_SIZE_VIDEO = 512 * 1024 * 1024; // 512MB
const DEFAULT_MAX_FILES = 10;

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook pour gérer l'upload de médias (images et vidéos) avec validation
 * Centralise la logique d'upload pour éviter la duplication dans les formulaires
 *
 * @example
 * const { upload, isUploading, validateFiles } = useMediaUpload({
 *   maxFiles: 5,
 *   onSuccess: (urls) => console.log('Uploaded:', urls),
 * });
 *
 * const handleFiles = async (files: File[]) => {
 *   const results = await upload(files);
 *   // results contient les URLs des fichiers uploadés
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
	 * Détermine le type de média à partir du type MIME du fichier
	 */
	const getMediaType = (file: File): "IMAGE" | "VIDEO" => {
		return file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
	};

	/**
	 * Vérifie si un fichier dépasse la limite de taille
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
		// Vérifier les fichiers trop gros
		const oversized = files.filter(isOversized);
		const validSizeFiles = files.filter((f) => !isOversized(f));

		if (oversized.length > 0) {
			const details = oversized
				.map((f) => `${f.name}: ${formatSize(f.size)}MB`)
				.join(", ");
			toast.error(
				`${oversized.length} fichier(s) dépassent la limite de taille`,
				{ description: details }
			);
		}

		// Vérifier le nombre de fichiers
		if (validSizeFiles.length > maxFiles) {
			toast.warning(
				`Maximum ${maxFiles} fichiers autorisés`,
				{
					description: `${validSizeFiles.length - maxFiles} fichier(s) ignoré(s)`,
				}
			);
			return validSizeFiles.slice(0, maxFiles);
		}

		return validSizeFiles;
	};

	/**
	 * Upload les fichiers vers UploadThing
	 * Valide automatiquement les fichiers avant upload
	 *
	 * @returns Liste des résultats d'upload avec URLs et types
	 */
	const upload = async (files: File[]): Promise<MediaUploadResult[]> => {
		const validFiles = validateFiles(files);
		if (validFiles.length === 0) return [];

		try {
			const results = await startUpload(validFiles);
			const uploadResults: MediaUploadResult[] = [];

			results?.forEach((result, index) => {
				const url = result.serverData?.url;
				if (url) {
					uploadResults.push({
						url,
						mediaType: getMediaType(validFiles[index]),
						fileName: validFiles[index].name,
					});
				}
			});

			options.onSuccess?.(uploadResults.map((r) => r.url));
			return uploadResults;
		} catch (error) {
			const err = error as Error;
			options.onError?.(err);
			toast.error("Échec de l'upload", {
				description: err.message,
				action: {
					label: "Réessayer",
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
		/** Utilitaire pour déterminer le type de média */
		getMediaType,
		/** Utilitaire pour vérifier si un fichier est trop gros */
		isOversized,
	};
}
