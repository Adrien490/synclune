/**
 * Helper functions and constants for the media upload hook.
 *
 * Extracted from use-media-upload.ts to keep each file under 500 lines.
 */

import {
	MAX_UPLOAD_COUNT_IMAGE,
	MAX_UPLOAD_SIZE_IMAGE,
	MAX_UPLOAD_SIZE_VIDEO,
} from "@/modules/media/constants/upload-size-limits";
import {
	ACCEPTED_IMAGE_MIME_TYPES,
	ACCEPTED_VIDEO_MIME_TYPES,
	HEIC_EXTENSIONS,
	IMAGE_EXTENSIONS,
	IMAGE_FORMATS_LABEL,
	VIDEO_EXTENSIONS,
	VIDEO_FORMATS_LABEL,
} from "@/modules/media/constants/media-limits.constants";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default max image size. SSOT: `constants/upload-size-limits.ts`. */
export const DEFAULT_MAX_SIZE_IMAGE = MAX_UPLOAD_SIZE_IMAGE;

/** Default max video size. SSOT: `constants/upload-size-limits.ts`. */
export const DEFAULT_MAX_SIZE_VIDEO = MAX_UPLOAD_SIZE_VIDEO;

/** Default max number of files per upload */
export const DEFAULT_MAX_FILES = MAX_UPLOAD_COUNT_IMAGE;

/** Default video upload concurrency */
export const DEFAULT_VIDEO_CONCURRENCY = 2;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Pourcentage d'avancement (0-100) d'un upload, **dérivé des octets** dès qu'ils
 * sont connus.
 *
 * ⚠️ Ne jamais revenir à `completed / total` seul. `uploadImages()` envoie tout le
 * lot d'images dans **un seul** `startUpload()` et n'incrémente `completed`
 * qu'après : la barre restait donc à 0 pendant tout l'envoi puis sautait à 100,
 * quel que soit le nombre de fichiers. Pire, l'écran affichait simultanément
 * « Envoi… 0 % » et « 5,6 Mo / 12,0 Mo · Reste 8s », et l'annonce lecteur d'écran
 * (throttlée aux paliers 0/25/50/75/100) restait bloquée sur « 0 pourcent ».
 *
 * Le repli sur le compte de fichiers ne sert qu'aux phases où aucun octet n'a
 * encore été comptabilisé (validation, compression).
 *
 * Signature structurelle volontaire : accepte aussi bien `UploadProgress`
 * (`types/hooks.types.ts`) que le `UploadProgressShape` des cartes admin.
 */
export function progressPercent(
	progress: {
		completed: number;
		total: number;
		bytesUploaded?: number;
		bytesTotal?: number;
	} | null,
): number {
	if (!progress) return 0;

	const { bytesTotal, bytesUploaded, completed, total } = progress;
	if (bytesTotal !== undefined && bytesTotal > 0) {
		return clampPercent(((bytesUploaded ?? 0) / bytesTotal) * 100);
	}
	if (total <= 0) return 0;
	return clampPercent((completed / total) * 100);
}

function clampPercent(value: number): number {
	return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Determines the media type from the MIME type.
 * Repli par extension pour le cas « MIME vide » d'iOS, cohérent avec
 * `isValidMediaType` — sans quoi un `.mp4` sans MIME était classé IMAGE et partait
 * dans le lot d'images.
 */
export function getMediaTypeFromFile(file: File): "IMAGE" | "VIDEO" {
	if (file.type.startsWith("video/")) return "VIDEO";
	if (file.type === "" && hasExtension(file.name, VIDEO_EXTENSIONS)) return "VIDEO";
	return "IMAGE";
}

function hasExtension(fileName: string, extensions: readonly string[]): boolean {
	const name = fileName.toLowerCase();
	return extensions.some((ext) => name.endsWith(ext));
}

/**
 * Vrai si le fichier porte un type MIME que le serveur accepte réellement.
 *
 * ⚠️ **Allowlist, pas préfixe.** La version précédente retournait `true` pour tout
 * `image/*` ou `video/*` : un `.mov` (`video/quicktime`), un `.svg`, un `.bmp`
 * traversaient donc toute la validation cliente, puis se faisaient refuser par
 * `validateMimeType` — après avoir téléversé jusqu'à 64 Mo. Le correctif « M13 »
 * n'avait retiré `.mov` que du **repli par extension** (branche « MIME vide »
 * d'iOS), en laissant le chemin normal intact.
 *
 * Le repli par extension reste réservé au seul cas où le navigateur ne fournit
 * aucun MIME — typiquement les éléments de la pellicule iOS.
 */
export function isValidMediaType(file: File): boolean {
	if (file.type !== "") {
		return (
			(ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type) ||
			(ACCEPTED_VIDEO_MIME_TYPES as readonly string[]).includes(file.type)
		);
	}
	return (
		hasExtension(file.name, IMAGE_EXTENSIONS) ||
		hasExtension(file.name, HEIC_EXTENSIONS) ||
		hasExtension(file.name, VIDEO_EXTENSIONS)
	);
}

/**
 * Libellé de refus nommant le fichier ET le format attendu — « le fichier a été
 * ignoré » sans dire pourquoi laisse l'utilisatrice réessayer à l'identique.
 */
export function describeRejectedFile(file: File): string {
	const kind = file.type.startsWith("video/") ? "video" : "image";
	const expected = kind === "video" ? VIDEO_FORMATS_LABEL : IMAGE_FORMATS_LABEL;
	const actual = file.type || "type inconnu";
	return `« ${file.name} » (${actual}) — formats acceptés : ${expected}`;
}
