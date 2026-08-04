/**
 * Constantes pour les URLs d'images de l'application
 * Centralise les URLs pour faciliter la maintenance et les mises à jour
 */
export const IMAGES = {
	/** Portrait de la creatrice Leane Taddei (schéma Founder, seo-config) */
	FOUNDER: "https://x1ain1wpub.ufs.sh/f/nyHesfTydKuSeQyF8C1jtfJpdXPZs5OLTYnRUHcmrCx7wNWq",
} as const;

/**
 * Fallback blur placeholder pour images dynamiques sans blurDataURL natif
 * (commandes, dashboard admin, media upload, page offline PWA).
 * SVG 10x10 (~280 octets), gradient crème → rose brand cohérent identité.
 */
export const IMAGE_BLUR_FALLBACK =
	"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjVlNmRjIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjVhMGMwIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+";
