/**
 * Fallback image for products without photos.
 *
 * ⚠️ DA (cf. CLAUDE.md § lexique) : le motif est une GUIRLANDE de petits
 * éléments polychromes — perles, gouttes, un cœur en PONCTUATION — jamais une
 * grosse pierre centrale. La version précédente était un diamant à facettes
 * commenté « girly » : la pierre précieuse posée au centre est le contre-brief
 * exact (« la marque multiplie de petits éléments — elle ne pose pas une
 * grosse pierre centrale »), et « girly » est rétrogradé depuis le 2026-08-06.
 *
 * Format : data URI SVG (~1,5 Ko, aucun fichier externe), base64 pré-calculé
 * pour éviter `Buffer.from()` (Node-only) à l'import côté client.
 * Statique uniquement : pas de <animate> SMIL — dans un <img>, une animation
 * SMIL boucle indéfiniment sans être stoppable ni sensible à
 * prefers-reduced-motion (WCAG 2.2.2).
 */

/**
 * Fallback image URL (data URI SVG)
 *
 * @description
 * SVG 400x500 (ratio 4:5, celui des cartes produit)
 * - Fond dégradé rose poudré
 * - Guirlande : fil arqué + 6 perles polychromes (rose / lavande / menthe /
 *   soleil) + 2 gouttes suspendues + 1 petit cœur central en pendentif
 * - Touches de peinture aux coins (accumulation, pas de symétrie parfaite)
 * - « Photo à venir » / « Bijou en préparation à l'atelier »
 *
 * @example
 * ```tsx
 * <Image src={FALLBACK_IMAGE_URL} alt="Photo à venir" fill />
 * ```
 */
const FALLBACK_IMAGE_URL =
	"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDQwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6b2tsY2goMC45NyAwLjAyIDM1MCkiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6b2tsY2goMC45MyAwLjA0NSAyMCkiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0idXJsKCNiZykiIC8+CiAgPHBhdGggZD0iTTYwLDIwNSBRMjAwLDI1NSAzNDAsMjA1IiBzdHJva2U9Im9rbGNoKDAuNTcgMC4yMCA1KSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjU1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+CiAgPGNpcmNsZSBjeD0iOTUiIGN5PSIyMTciIHI9IjgiIGZpbGw9Im9rbGNoKDAuNzUgMC4xMCAyOTUpIiBvcGFjaXR5PSIwLjkiIC8+CiAgPGNpcmNsZSBjeD0iMTMwIiBjeT0iMjI3IiByPSI2IiBmaWxsPSJva2xjaCgwLjg0IDAuMTEgODUpIiBvcGFjaXR5PSIwLjkiIC8+CiAgPGNpcmNsZSBjeD0iMTY1IiBjeT0iMjM0IiByPSIxMCIgZmlsbD0ib2tsY2goMC42MiAwLjE5IDUpIiBvcGFjaXR5PSIwLjkiIC8+CiAgPGNpcmNsZSBjeD0iMjM1IiBjeT0iMjM0IiByPSIxMCIgZmlsbD0ib2tsY2goMC44MyAwLjA5IDE2NSkiIG9wYWNpdHk9IjAuOSIgLz4KICA8Y2lyY2xlIGN4PSIyNzAiIGN5PSIyMjciIHI9IjYiIGZpbGw9Im9rbGNoKDAuNjIgMC4xOSA1KSIgb3BhY2l0eT0iMC45IiAvPgogIDxjaXJjbGUgY3g9IjMwNSIgY3k9IjIxNyIgcj0iOCIgZmlsbD0ib2tsY2goMC44NCAwLjExIDg1KSIgb3BhY2l0eT0iMC45IiAvPgogIDxwYXRoIGQ9Ik0xMzAsMjMzIEwxMzAsMjQ0IiBzdHJva2U9Im9rbGNoKDAuNTcgMC4yMCA1KSIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNSIgLz4KICA8cGF0aCBkPSJNMTMwLDI0NCBDMTMzLDI0OSAxMzUsMjUyIDEzNSwyNTUgQTUsNSAwIDEsMSAxMjUsMjU1IEMxMjUsMjUyIDEyNywyNDkgMTMwLDI0NCBaIiBmaWxsPSJva2xjaCgwLjc1IDAuMTAgMjk1KSIgb3BhY2l0eT0iMC45IiAvPgogIDxwYXRoIGQ9Ik0yNzAsMjMzIEwyNzAsMjQ0IiBzdHJva2U9Im9rbGNoKDAuNTcgMC4yMCA1KSIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNSIgLz4KICA8cGF0aCBkPSJNMjcwLDI0NCBDMjczLDI0OSAyNzUsMjUyIDI3NSwyNTUgQTUsNSAwIDEsMSAyNjUsMjU1IEMyNjUsMjUyIDI2NywyNDkgMjcwLDI0NCBaIiBmaWxsPSJva2xjaCgwLjg0IDAuMTEgODUpIiBvcGFjaXR5PSIwLjkiIC8+CiAgPHBhdGggZD0iTTIwMCwyNDEgTDIwMCwyNTIiIHN0cm9rZT0ib2tsY2goMC41NyAwLjIwIDUpIiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iMC41IiAvPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIwMCwgMjU0KSI+CiAgICA8cGF0aCBkPSJNMCAzIEMwIDAuNSAtMiAtMSAtNCAtMSBDLTYuNSAtMSAtOCAxIC04IDMuNSBDLTggNyAtMyAxMCAwIDEyIEMzIDEwIDggNyA4IDMuNSBDOCAxIDYuNSAtMSA0IC0xIEMyIC0xIDAgMC41IDAgMyBaIiBmaWxsPSJva2xjaCgwLjYyIDAuMTkgNSkiIG9wYWNpdHk9IjAuOTUiIC8+CiAgPC9nPgogIDxjaXJjbGUgY3g9IjcwIiBjeT0iMTMwIiByPSIzIiBmaWxsPSJva2xjaCgwLjg0IDAuMTEgODUpIiBvcGFjaXR5PSIwLjgiIC8+CiAgPGNpcmNsZSBjeD0iMzMwIiBjeT0iMTIwIiByPSIyLjUiIGZpbGw9Im9rbGNoKDAuNzUgMC4xMCAyOTUpIiBvcGFjaXR5PSIwLjgiIC8+CiAgPGNpcmNsZSBjeD0iMTA1IiBjeT0iMzk1IiByPSIyLjUiIGZpbGw9Im9rbGNoKDAuODMgMC4wOSAxNjUpIiBvcGFjaXR5PSIwLjgiIC8+CiAgPGNpcmNsZSBjeD0iMzE1IiBjeT0iNDAwIiByPSIzIiBmaWxsPSJva2xjaCgwLjYyIDAuMTkgNSkiIG9wYWNpdHk9IjAuNyIgLz4KICA8dGV4dCB4PSIyMDAiIHk9IjMzMCIgZm9udC1mYW1pbHk9IidJbnRlcicsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtd2VpZ2h0PSI2MDAiIGZpbGw9Im9rbGNoKDAuNTcgMC4yMCA1KSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgb3BhY2l0eT0iMC45Ij5QaG90byDDoCB2ZW5pcjwvdGV4dD4KICA8dGV4dCB4PSIyMDAiIHk9IjM1NSIgZm9udC1mYW1pbHk9IidJbnRlcicsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9Im9rbGNoKDAuNDUgMC4wMyAxMCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIG9wYWNpdHk9IjAuNyI+Qmlqb3UgZW4gcHLDqXBhcmF0aW9uIMOgIGwnYXRlbGllcjwvdGV4dD4KPC9zdmc+";

/**
 * Default alt text for the fallback image
 */
const FALLBACK_IMAGE_ALT = "Photo du produit à venir - En préparation";

/**
 * Complete fallback image object.
 * Ready to use in getPrimaryImage() and buildGallery().
 */
export const FALLBACK_PRODUCT_IMAGE = {
	id: "fallback-image",
	url: FALLBACK_IMAGE_URL,
	alt: FALLBACK_IMAGE_ALT,
	type: "IMAGE" as const,
	blurDataUrl: undefined,
} as const;
