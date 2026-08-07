/**
 * Constantes pour les URLs d'images de l'application
 * Centralise les URLs pour faciliter la maintenance et les mises à jour
 */
export const IMAGES = {
	/**
	 * Portrait de la créatrice Léane Taddei — schéma Founder (`seo-config.ts`)
	 * et section atelier de la landing (via `ATELIER_IMAGE`).
	 *
	 * ⚠️ `null` tant que l'asset n'est pas ré-uploadé : l'URL UploadThing
	 * historique (`https://x1ain1wpub.ufs.sh/f/nyHesfTydKuSeQyF8C1jtfJpdXPZs5OLTYnRUHcmrCx7wNWq`)
	 * répond 404 (re-vérifié le 2026-08-06). Publier une URL morte mettait un
	 * cadre blanc dans la section atelier ET une image cassée dans les nœuds
	 * `Person` et `HowTo` du @graph. Les consommateurs branchent sur `null` :
	 * les schémas OMETTENT leur champ `image`, la section rend la plaque
	 * dessinée. Ré-upload = coller la nouvelle URL ici, rien d'autre.
	 */
	FOUNDER: null as string | null,
} as const;

/**
 * Fallback blur placeholder pour images dynamiques sans blurDataURL natif
 * (commandes, dashboard admin, media upload, page offline PWA).
 * SVG 10x10 (~280 octets), gradient crème → rose brand cohérent identité.
 */
export const IMAGE_BLUR_FALLBACK =
	"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjVlNmRjIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjVhMGMwIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+";
