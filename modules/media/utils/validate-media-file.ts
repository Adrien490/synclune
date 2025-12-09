/**
 * Constantes et utilitaires de validation des fichiers média
 *
 * Centralise la logique de validation des tailles de fichiers
 * pour éviter la duplication entre les différents formulaires d'upload.
 */

/**
 * Limites de taille des fichiers par type de média
 */
export const MEDIA_SIZE_LIMITS = {
	/** Images: 16MB max (aligné sur UploadThing catalogMedia) */
	IMAGE: 16 * 1024 * 1024,
	/** Vidéos: 512MB max */
	VIDEO: 512 * 1024 * 1024,
} as const;

/**
 * Types MIME considérés comme des vidéos
 */
export const VIDEO_MIME_PREFIXES = ["video/"] as const;

/**
 * Résultat de la validation d'un fichier média
 */
export interface MediaFileValidationResult {
	/** true si le fichier est valide */
	valid: boolean;
	/** Message d'erreur si invalide */
	error?: string;
	/** Type de média détecté */
	mediaType: "IMAGE" | "VIDEO";
	/** Taille du fichier en bytes */
	fileSize: number;
	/** Limite de taille applicable en bytes */
	sizeLimit: number;
}

/**
 * Détermine si un fichier est une vidéo basé sur son type MIME
 */
export function isVideoFile(file: File): boolean {
	return VIDEO_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
}

/**
 * Valide un fichier média (image ou vidéo) selon les limites de taille
 *
 * @param file - Le fichier à valider
 * @returns Résultat de la validation avec détails
 *
 * @example
 * const result = validateMediaFile(file);
 * if (!result.valid) {
 *   toast.error(result.error);
 *   return;
 * }
 */
export function validateMediaFile(file: File): MediaFileValidationResult {
	const isVideo = isVideoFile(file);
	const mediaType = isVideo ? "VIDEO" : "IMAGE";
	const sizeLimit = isVideo ? MEDIA_SIZE_LIMITS.VIDEO : MEDIA_SIZE_LIMITS.IMAGE;

	if (file.size > sizeLimit) {
		const sizeMB = (file.size / 1024 / 1024).toFixed(2);
		const limitMB = sizeLimit / 1024 / 1024;
		return {
			valid: false,
			error: `Le fichier dépasse la limite de ${limitMB}MB (${sizeMB}MB)`,
			mediaType,
			fileSize: file.size,
			sizeLimit,
		};
	}

	return {
		valid: true,
		mediaType,
		fileSize: file.size,
		sizeLimit,
	};
}

/**
 * Valide un fichier destiné à être l'image principale (pas de vidéo autorisée)
 *
 * @param file - Le fichier à valider
 * @returns Résultat de la validation
 *
 * @example
 * const result = validatePrimaryImage(file);
 * if (!result.valid) {
 *   toast.error(result.error);
 *   return;
 * }
 */
export function validatePrimaryImage(file: File): MediaFileValidationResult {
	const isVideo = isVideoFile(file);

	if (isVideo) {
		return {
			valid: false,
			error: "Les vidéos ne peuvent pas être utilisées comme média principal. Veuillez uploader une image (JPG, PNG, WebP, GIF ou AVIF).",
			mediaType: "VIDEO",
			fileSize: file.size,
			sizeLimit: MEDIA_SIZE_LIMITS.VIDEO,
		};
	}

	return validateMediaFile(file);
}

/**
 * Valide plusieurs fichiers et retourne les fichiers valides + les erreurs
 *
 * @param files - Les fichiers à valider
 * @param options - Options de validation
 * @returns Fichiers valides et erreurs rencontrées
 */
export function validateMediaFiles(
	files: File[],
	options?: {
		/** Si true, rejette les vidéos */
		rejectVideos?: boolean;
		/** Nombre maximum de fichiers à garder */
		maxFiles?: number;
	}
): {
	validFiles: File[];
	errors: string[];
	skipped: number;
} {
	const validFiles: File[] = [];
	const errors: string[] = [];
	let skipped = 0;

	const filesToProcess = options?.maxFiles
		? files.slice(0, options.maxFiles)
		: files;

	if (options?.maxFiles && files.length > options.maxFiles) {
		skipped = files.length - options.maxFiles;
	}

	for (const file of filesToProcess) {
		const result = options?.rejectVideos
			? validatePrimaryImage(file)
			: validateMediaFile(file);

		if (result.valid) {
			validFiles.push(file);
		} else if (result.error) {
			errors.push(`${file.name}: ${result.error}`);
		}
	}

	return { validFiles, errors, skipped };
}

// ============================================================================
// VALIDATION HELPERS (utilisés par les scripts de migration)
// ============================================================================

/** Pattern CUID (25 caractères alphanumériques commençant par 'c') */
const CUID_PATTERN = /^c[a-z0-9]{24}$/;

/**
 * Domaines UploadThing autorisés (liste stricte)
 * - Domaines exacts pour les endpoints principaux
 * - Suffixes autorisés pour les sous-domaines CDN dynamiques
 */
const UPLOADTHING_EXACT_HOSTS: Set<string> = new Set([
	"utfs.io",
	"uploadthing.com",
	"ufs.sh",
]);

/**
 * Suffixes autorisés pour les sous-domaines UploadThing
 * Ex: x1ain1wpub.ufs.sh, cdn.uploadthing.com
 */
const UPLOADTHING_ALLOWED_SUFFIXES = [".ufs.sh", ".uploadthing.com"] as const;

/**
 * Valide qu'un ID est un CUID valide
 * Empêche l'injection de commandes via des IDs malveillants
 */
export function isValidCuid(id: string): boolean {
	return CUID_PATTERN.test(id);
}

/**
 * Valide qu'une URL provient d'un domaine UploadThing autorisé
 * - Accepte les domaines exacts (utfs.io, uploadthing.com, ufs.sh)
 * - Accepte les sous-domaines (*.ufs.sh, *.uploadthing.com)
 */
export function isValidUploadThingUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname;

		// Vérification exacte
		if (UPLOADTHING_EXACT_HOSTS.has(hostname)) {
			return true;
		}

		// Vérification des sous-domaines autorisés
		return UPLOADTHING_ALLOWED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
	} catch {
		return false;
	}
}
