/**
 * Validation des URLs de médias (images, vidéos)
 *
 * Centralise la whitelist des domaines autorisés pour éviter
 * l'envoi de contenus malveillants ou non-sécurisés.
 */

/**
 * Domaines UploadThing autorisés pour les médias uploadés — SSOT : le set
 * `UPLOADTHING_EXACT_HOSTS` (modules/media/utils/validate-media-file.ts) est
 * CONSTRUIT depuis cette liste, il n'y a rien à synchroniser à la main.
 */
export const UPLOADTHING_DOMAINS = [
	"utfs.io",
	"ufs.sh",
	"uploadthing.com",
	// Legacy S3 domain kept for backward-compat with files uploaded before v7.
	// New uploads use *.ufs.sh. UploadThing may change storage providers,
	// so do not rely on this domain for new files.
	"uploadthing-prod.s3.us-west-2.amazonaws.com",
] as const;

/**
 * Domaines Synclune (CDN, domaine principal)
 */
const SYNCLUNE_DOMAINS = ["synclune.fr", "cdn.synclune.fr"] as const;

/**
 * Tous les domaines autorisés pour les médias
 */
export const ALLOWED_MEDIA_DOMAINS = [...UPLOADTHING_DOMAINS, ...SYNCLUNE_DOMAINS] as const;

/**
 * Vérifie si une URL provient d'un domaine autorisé
 *
 * @param url - URL à vérifier
 * @param allowedDomains - Liste des domaines autorisés (par défaut: UploadThing uniquement)
 * @returns true si le domaine est autorisé
 */
export function isAllowedMediaDomain(
	url: string,
	allowedDomains: readonly string[] = UPLOADTHING_DOMAINS,
): boolean {
	try {
		const parsed = new URL(url);

		// HTTPS obligatoire (audit média M11) : `isAllowedMediaDomain` ne testait que
		// le hostname, si bien qu'un `http://utfs.io/f/...` était une URL média
		// valide en base — contenu mixte à l'affichage, et asymétrie avec
		// `isValidUploadThingUrl` qui exige HTTPS sur le chemin de suppression.
		if (parsed.protocol !== "https:") {
			return false;
		}

		const hostname = parsed.hostname;
		return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
	} catch {
		return false;
	}
}

// ⚠️ `isValidImageUrl` / `getValidImageUrl` ont été retirés (audit
// 2026-08-16) : zéro appelant hors tests. Leur docstring promettait les line
// items Stripe, mais `checkout-order.service.ts` s'appuie sur la validation à
// l'ÉCRITURE (`product-media.schemas.ts` + invariant « premier média = image »)
// — l'invariant tient en amont, pas par un filtre à la lecture.
