/**
 * Validation des URLs de médias (images, vidéos)
 *
 * Centralise la whitelist des domaines autorisés pour éviter
 * l'envoi de contenus malveillants ou non-sécurisés.
 */

/**
 * Domaines UploadThing autorisés pour les médias uploadés
 */
export const UPLOADTHING_DOMAINS = [
	"utfs.io",
	"ufs.sh",
	"uploadthing.com",
	"uploadthing-prod.s3.us-west-2.amazonaws.com",
] as const

/**
 * Domaines Synclune (CDN, domaine principal)
 */
export const SYNCLUNE_DOMAINS = ["synclune.fr", "cdn.synclune.fr"] as const

/**
 * Tous les domaines autorisés pour les médias
 */
export const ALLOWED_MEDIA_DOMAINS = [
	...UPLOADTHING_DOMAINS,
	...SYNCLUNE_DOMAINS,
] as const

/**
 * Vérifie si une URL provient d'un domaine autorisé
 *
 * @param url - URL à vérifier
 * @param allowedDomains - Liste des domaines autorisés (par défaut: UploadThing uniquement)
 * @returns true si le domaine est autorisé
 */
export function isAllowedMediaDomain(
	url: string,
	allowedDomains: readonly string[] = UPLOADTHING_DOMAINS
): boolean {
	try {
		const hostname = new URL(url).hostname
		return allowedDomains.some(
			(domain) => hostname === domain || hostname.endsWith(`.${domain}`)
		)
	} catch {
		return false
	}
}

/**
 * Vérifie qu'une URL d'image est valide et sécurisée (HTTPS + domaine autorisé)
 * Utilisé principalement pour Stripe qui requiert HTTPS
 *
 * @param url - URL à valider
 * @returns true si l'URL est https et sur un domaine autorisé
 */
export function isValidImageUrl(url: string | undefined | null): boolean {
	if (!url) return false

	try {
		const parsed = new URL(url)

		// Doit être HTTPS
		if (parsed.protocol !== "https:") {
			return false
		}

		// Doit être sur un domaine autorisé (tous les domaines)
		return isAllowedMediaDomain(url, ALLOWED_MEDIA_DOMAINS)
	} catch {
		return false
	}
}

/**
 * Retourne l'URL si valide, undefined sinon
 * Utile pour les line items Stripe
 */
export function getValidImageUrl(
	url: string | undefined | null
): string | undefined {
	return isValidImageUrl(url) ? (url as string) : undefined
}
