/**
 * Identifiants des apps UploadThing du compte Synclune — SSOT.
 *
 * ⚠️ COÛT/SÉCURITÉ (audit coûts P1-1) : cette liste alimente AUSSI
 * `images.remotePatterns` dans `next.config.ts`. Elle est la frontière qui
 * empêche l'optimiseur d'images Vercel de transformer le contenu d'un tiers.
 *
 * `*.ufs.sh` est un domaine **multi-tenant** : chaque client UploadThing a son
 * propre `<appId>.ufs.sh`. Un wildcard `*.ufs.sh` dans `remotePatterns` laissait
 * donc n'importe qui pointer `/_next/image?url=https://<son-app>.ufs.sh/f/<clé>`
 * vers Synclune, avec un nombre de sources ILLIMITÉ × 15 largeurs × 2 qualités
 * × 2 formats de transformations facturées — et `/_next/image` est exclu du
 * matcher de `proxy.ts`, donc sans rate limit.
 *
 * En ajouter un ⇒ élargir la surface facturable. N'ajouter que des apps
 * réellement possédées par le compte Synclune.
 */
export const UPLOADTHING_APP_IDS = [
	"b2ik2fsq66", // App principal — images produits / hero LCP
	"x1ain1wpub", // Images statiques (atelier, founder)
] as const;

/**
 * UploadThing CDN hostnames pour preconnect SSR.
 *
 * Chaque app UploadThing a un sous-domaine `<appId>.ufs.sh` qui sert les
 * fichiers via `/_next/image?url=https%3A%2F%2F<appId>.ufs.sh%2Ff%2F<key>`.
 * Sans preconnect, le navigateur doit faire DNS + TCP + TLS handshake
 * AVANT de pouvoir télécharger l'image LCP — sur mobile 4G ce délai
 * coûte ~500-2000ms (resource load delay LCP mesuré Lighthouse).
 *
 * Dérivé de `UPLOADTHING_APP_IDS` : preconnect et allowlist de l'optimiseur ne
 * peuvent plus diverger (un host preconnecté mais non autorisé = handshake
 * gaspillé ; l'inverse = image en 400).
 */
export const UPLOADTHING_CDN_HOSTS = UPLOADTHING_APP_IDS.map((appId) => `https://${appId}.ufs.sh`);
