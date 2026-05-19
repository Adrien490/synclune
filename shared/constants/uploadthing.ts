/**
 * UploadThing CDN hostnames pour preconnect SSR.
 *
 * Chaque app UploadThing a un sous-domaine `<appId>.ufs.sh` qui sert les
 * fichiers via `/_next/image?url=https%3A%2F%2F<appId>.ufs.sh%2Ff%2F<key>`.
 * Sans preconnect, le navigateur doit faire DNS + TCP + TLS handshake
 * AVANT de pouvoir télécharger l'image LCP — sur mobile 4G ce délai
 * coûte ~500-2000ms (resource load delay LCP mesuré Lighthouse).
 *
 * Si l'appId UploadThing change (migration de compte / rotation), mettre
 * à jour cette liste — voir `next.config.ts` `images.remotePatterns` qui
 * accepte le wildcard `*.ufs.sh` côté optimizer.
 */
export const UPLOADTHING_CDN_HOSTS = [
	"https://b2ik2fsq66.ufs.sh", // App principal — images produits / hero LCP
	"https://x1ain1wpub.ufs.sh", // Images statiques (atelier, founder)
] as const;
