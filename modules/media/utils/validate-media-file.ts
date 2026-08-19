/**
 * Media constants and URL/ID validation helpers.
 *
 * Note (audit média) : les helpers de validation de taille par `File`
 * (`validateMediaFile` / `validatePrimaryImage` / `validateMediaFiles` /
 * `isVideoFile`) ont été retirés — ils n'avaient plus aucun appelant en
 * production. La validation de taille vit désormais dans `useMediaUpload`
 * (`maxSizeImage` / `maxSizeVideo`, propagés par chaque consommateur : 16 Mo
 * pour `catalogMedia`), doublée côté serveur par `validateFileSize` dans le
 * middleware UploadThing.
 */

import {
	MAX_UPLOAD_SIZE_IMAGE,
	MAX_UPLOAD_SIZE_VIDEO,
} from "@/modules/media/constants/upload-size-limits.constants";

import { UPLOADTHING_DOMAINS } from "@/shared/lib/media-validation";

/**
 * File size limits by media type — les DEUX clés référencent la SSOT
 * `constants/upload-size-limits.ts`. `CATALOG_IMAGE` était un littéral 16 Mo
 * recopié : un changement du plafond dans la SSOT aurait laissé la copie
 * admin annoncer le mauvais maximum.
 */
export const MEDIA_SIZE_LIMITS = {
	/** Catalog images — SSOT `constants/upload-size-limits.ts` */
	CATALOG_IMAGE: MAX_UPLOAD_SIZE_IMAGE,
	/** Videos — SSOT `constants/upload-size-limits.ts` */
	VIDEO: MAX_UPLOAD_SIZE_VIDEO,
} as const;

// ============================================================================
// VALIDATION HELPERS (delete/upload guards)
// ============================================================================
// ⚠️ `isValidCuid` a été retiré (audit 2026-08-16) : zéro appelant hors tests
// — son but historique (« prevents command injection » dans les scripts de
// migration) ne protégeait plus rien depuis leur suppression.

/**
 * Allowed UploadThing domains (strict list).
 * - Exact domains for main endpoints
 * - Allowed suffixes for dynamic CDN subdomains
 * - S3 legacy domain for older uploads
 *
 * Built from UPLOADTHING_DOMAINS in shared/lib/media-validation.ts (single source of truth).
 */
const UPLOADTHING_EXACT_HOSTS: Set<string> = new Set(UPLOADTHING_DOMAINS);

/**
 * Allowed suffixes for UploadThing subdomains.
 * E.g. x1ain1wpub.ufs.sh, cdn.uploadthing.com
 */
const UPLOADTHING_ALLOWED_SUFFIXES = [".ufs.sh", ".uploadthing.com"] as const;

/**
 * Validates that a URL comes from an allowed UploadThing domain.
 * - Enforces HTTPS only
 * - Accepts exact domains (utfs.io, uploadthing.com, ufs.sh)
 * - Accepts subdomains (*.ufs.sh, *.uploadthing.com)
 */
export function isValidUploadThingUrl(url: string): boolean {
	try {
		const parsed = new URL(url);

		// Security: enforce HTTPS only
		if (parsed.protocol !== "https:") {
			return false;
		}

		const hostname = parsed.hostname;

		// Exact match check
		if (UPLOADTHING_EXACT_HOSTS.has(hostname)) {
			return true;
		}

		// Allowed subdomain check
		return UPLOADTHING_ALLOWED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
	} catch {
		return false;
	}
}
