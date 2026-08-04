/**
 * Fallback image for products without photos
 *
 * Elegant SVG with Synclune's girly and colorful style.
 * Uses oklch colors from the design system (pink, gold).
 *
 * Format: Optimized data URI SVG (no external file)
 * Size: ~1KB (very lightweight, no performance impact)
 *
 * The base64 is pre-computed to avoid runtime Buffer.from() usage,
 * which is Node-only and would fail if imported client-side.
 */

/**
 * Fallback image URL (data URI SVG)
 *
 * @description
 * Responsive SVG 400x500px (4:5 ratio, standard for product cards)
 * - Powder pink to warm gold gradient background
 * - Stylized diamond/jewelry icon
 * - "Photo a venir" text in French
 * - Matches the colorful and girly boutique style
 * - Sparkles STATIQUES uniquement : pas de <animate> SMIL — dans un <img>,
 *   une animation SMIL boucle indéfiniment sans être stoppable ni sensible à
 *   prefers-reduced-motion (WCAG 2.2.2)
 *
 * @example
 * ```tsx
 * <Image src={FALLBACK_IMAGE_URL} alt="Photo a venir" fill />
 * ```
 */
// Pre-computed base64 of the SVG below (avoids Node-only Buffer.from() at import time):
// <svg width="400" height="500"> ... Photo à venir ... </svg>
const FALLBACK_IMAGE_URL =
	"data:image/svg+xml;base64,Cjxzdmcgd2lkdGg9IjQwMCIgaGVpZ2h0PSI1MDAiIHZpZXdCb3g9IjAgMCA0MDAgNTAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDwhLS0gQmFja2dyb3VuZCBncmFkaWVudCBwaW5rIHRvIGdvbGQgKG9rbGNoIGNvbG9ycyBmcm9tIGRlc2lnbiBzeXN0ZW0pIC0tPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJiZy1saW5lYXIiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjpva2xjaCgwLjg4IDAuMDggMjApO3N0b3Atb3BhY2l0eTowLjYiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTAlIiBzdHlsZT0ic3RvcC1jb2xvcjpva2xjaCgwLjk5IDAuMDA4IDE1KTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjpva2xjaCgwLjc1IDAuMTIgNzUpO3N0b3Atb3BhY2l0eTowLjUiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgoKICAgIDwhLS0gR3JhZGllbnQgZm9yIHRoZSBkaWFtb25kIGljb24gLS0+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImRpYW1vbmQtZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjpva2xjaCgwLjU3IDAuMjAgNSkiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6b2tsY2goMC43NSAwLjEyIDc1KSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgoKICA8IS0tIEJhY2tncm91bmQgLS0+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI1MDAiIGZpbGw9InVybCgjYmctbGluZWFyKSIgLz4KCiAgPCEtLSBTdHlsaXplZCBkaWFtb25kL2pld2VscnkgaWNvbiAoY2VudGVyZWQpIC0tPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIwMCwgMjIwKSI+CiAgICA8IS0tIERpYW1vbmQgYm9keSAtLT4KICAgIDxwYXRoCiAgICAgIGQ9Ik0wLC01MCBMNDAsLTEwIEwzMCw1MCBMLTMwLDUwIEwtNDAsLTEwIFoiCiAgICAgIGZpbGw9InVybCgjZGlhbW9uZC1ncmFkaWVudCkiCiAgICAgIG9wYWNpdHk9IjAuOSIKICAgIC8+CiAgICA8IS0tIEZhY2V0cyBmb3Igc2hpbmUgZWZmZWN0IC0tPgogICAgPHBhdGggZD0iTTAsLTUwIEwwLDUwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNSIgLz4KICAgIDxwYXRoIGQ9Ik0tMzAsLTIwIEwzMCwtMjAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjQiIC8+CiAgICA8cGF0aCBkPSJNLTIwLDEwIEwyMCwxMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNCIgLz4KCiAgICA8IS0tIERlY29yYXRpdmUgc3BhcmtsZXMgYXJvdW5kIChnaXJseSBzdHlsZSkgLS0+CiAgICA8Y2lyY2xlIGN4PSItNjAiIGN5PSItNDAiIHI9IjMiIGZpbGw9Im9rbGNoKDAuNzUgMC4xMiA3NSkiIG9wYWNpdHk9IjAuOCI+CiAgICA8L2NpcmNsZT4KICAgIDxjaXJjbGUgY3g9IjY1IiBjeT0iLTM1IiByPSIyIiBmaWxsPSJva2xjaCgwLjU3IDAuMjAgNSkiIG9wYWNpdHk9IjAuNyI+CiAgICA8L2NpcmNsZT4KICAgIDxjaXJjbGUgY3g9Ii01NSIgY3k9IjY1IiByPSIyLjUiIGZpbGw9Im9rbGNoKDAuNzUgMC4xMiA3NSkiIG9wYWNpdHk9IjAuNzUiPgogICAgPC9jaXJjbGU+CiAgICA8Y2lyY2xlIGN4PSI2MCIgY3k9IjYwIiByPSIzIiBmaWxsPSJva2xjaCgwLjU3IDAuMjAgNSkiIG9wYWNpdHk9IjAuOCI+CiAgICA8L2NpcmNsZT4KICA8L2c+CgogIDwhLS0gUGhvdG8gYSB2ZW5pciB0ZXh0IC0tPgogIDx0ZXh0CiAgICB4PSIyMDAiCiAgICB5PSIzMzAiCiAgICBmb250LWZhbWlseT0iJ0ludGVyJywgc2Fucy1zZXJpZiIKICAgIGZvbnQtc2l6ZT0iMTgiCiAgICBmb250LXdlaWdodD0iNjAwIgogICAgZmlsbD0ib2tsY2goMC41NyAwLjIwIDUpIgogICAgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgIG9wYWNpdHk9IjAuOSIKICA+CiAgICBQaG90byDDoCB2ZW5pcgogIDwvdGV4dD4KCiAgPCEtLSBEZWNvcmF0aXZlIHN1YnRleHQgLS0+CiAgPHRleHQKICAgIHg9IjIwMCIKICAgIHk9IjM1NSIKICAgIGZvbnQtZmFtaWx5PSInSW50ZXInLCBzYW5zLXNlcmlmIgogICAgZm9udC1zaXplPSIxNCIKICAgIGZpbGw9Im9rbGNoKDAuNDUgMC4wMyAxMCkiCiAgICB0ZXh0LWFuY2hvcj0ibWlkZGxlIgogICAgb3BhY2l0eT0iMC43IgogID4KICAgIOKcqCBQcm9kdWl0IGVuIHByw6lwYXJhdGlvbiDinKgKICA8L3RleHQ+Cjwvc3ZnPgo=";

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
	mediaType: "IMAGE" as const,
	blurDataUrl: undefined,
} as const;
