/**
 * Image de fallback pour les produits sans photo
 *
 * SVG élégant avec le style girly et coloré de Synclune
 * Utilise les couleurs oklch du design system (rose, doré)
 *
 * Format: Data URI SVG optimisé (pas de fichier externe)
 * Taille: ~1KB (très léger, pas d'impact performance)
 */

/**
 * URL de l'image de fallback (data URI SVG)
 *
 * @description
 * SVG responsive 400x500px (ratio 4:5 standard des product cards)
 * - Fond dégradé rose poudré → doré chaleureux
 * - Icône de diamant/bijou stylisée
 * - Texte "Photo à venir" en français
 * - Conforme au style coloré et girly de la boutique
 *
 * @example
 * ```tsx
 * <Image src={FALLBACK_IMAGE_URL} alt="Photo à venir" fill />
 * ```
 */
export const FALLBACK_IMAGE_URL = `data:image/svg+xml;base64,${Buffer.from(
	`
<svg width="400" height="500" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Dégradé de fond rose → doré (oklch colors from design system) -->
  <defs>
    <linearGradient id="bg-linear" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:oklch(0.88 0.08 20);stop-opacity:0.6" />
      <stop offset="50%" style="stop-color:oklch(0.99 0.008 15);stop-opacity:1" />
      <stop offset="100%" style="stop-color:oklch(0.75 0.12 75);stop-opacity:0.5" />
    </linearGradient>

    <!-- Dégradé pour l'icône diamant -->
    <linearGradient id="diamond-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:oklch(0.57 0.20 5)" />
      <stop offset="100%" style="stop-color:oklch(0.75 0.12 75)" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="400" height="500" fill="url(#bg-linear)" />

  <!-- Icône diamant/bijou stylisée (centré) -->
  <g transform="translate(200, 220)">
    <!-- Corps du diamant -->
    <path
      d="M0,-50 L40,-10 L30,50 L-30,50 L-40,-10 Z"
      fill="url(#diamond-gradient)"
      opacity="0.9"
    />
    <!-- Facettes pour effet de brillance -->
    <path d="M0,-50 L0,50" stroke="white" stroke-width="2" opacity="0.5" />
    <path d="M-30,-20 L30,-20" stroke="white" stroke-width="1.5" opacity="0.4" />
    <path d="M-20,10 L20,10" stroke="white" stroke-width="1.5" opacity="0.4" />

    <!-- Sparkles décoratifs autour (style girly) -->
    <circle cx="-60" cy="-40" r="3" fill="oklch(0.75 0.12 75)" opacity="0.8">
      <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="65" cy="-35" r="2" fill="oklch(0.57 0.20 5)" opacity="0.7">
      <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="-55" cy="65" r="2.5" fill="oklch(0.75 0.12 75)" opacity="0.75">
      <animate attributeName="opacity" values="0.75;1;0.75" dur="3s" repeatCount="indefinite" />
    </circle>
    <circle cx="60" cy="60" r="3" fill="oklch(0.57 0.20 5)" opacity="0.8">
      <animate attributeName="opacity" values="0.8;1;0.8" dur="2.2s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Texte "Photo à venir" -->
  <text
    x="200"
    y="330"
    font-family="'Inter', sans-serif"
    font-size="18"
    font-weight="600"
    fill="oklch(0.57 0.20 5)"
    text-anchor="middle"
    opacity="0.9"
  >
    Photo à venir
  </text>

  <!-- Sous-texte décoratif -->
  <text
    x="200"
    y="355"
    font-family="'Inter', sans-serif"
    font-size="14"
    fill="oklch(0.45 0.03 10)"
    text-anchor="middle"
    opacity="0.7"
  >
    ✨ Bijou en préparation ✨
  </text>
</svg>
`,
	"utf-8"
).toString("base64")}`;

/**
 * Alt text par défaut pour l'image de fallback
 */
export const FALLBACK_IMAGE_ALT = "Photo du bijou à venir - En préparation";

/**
 * Objet complet pour l'image de fallback
 * Prêt à être utilisé dans getPrimaryImage() et buildGallery()
 */
export const FALLBACK_PRODUCT_IMAGE = {
	id: "fallback-image",
	url: FALLBACK_IMAGE_URL,
	alt: FALLBACK_IMAGE_ALT,
	mediaType: "IMAGE" as const,
	blurDataURL: undefined,
} as const;
