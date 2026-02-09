/**
 * Fallback image for products without photos
 *
 * Elegant SVG with Synclune's girly and colorful style.
 * Uses oklch colors from the design system (pink, gold).
 *
 * Format: Optimized data URI SVG (no external file)
 * Size: ~1KB (very lightweight, no performance impact)
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
 *
 * @example
 * ```tsx
 * <Image src={FALLBACK_IMAGE_URL} alt="Photo a venir" fill />
 * ```
 */
export const FALLBACK_IMAGE_URL = `data:image/svg+xml;base64,${Buffer.from(
	`
<svg width="400" height="500" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient pink to gold (oklch colors from design system) -->
  <defs>
    <linearGradient id="bg-linear" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:oklch(0.88 0.08 20);stop-opacity:0.6" />
      <stop offset="50%" style="stop-color:oklch(0.99 0.008 15);stop-opacity:1" />
      <stop offset="100%" style="stop-color:oklch(0.75 0.12 75);stop-opacity:0.5" />
    </linearGradient>

    <!-- Gradient for the diamond icon -->
    <linearGradient id="diamond-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:oklch(0.57 0.20 5)" />
      <stop offset="100%" style="stop-color:oklch(0.75 0.12 75)" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="400" height="500" fill="url(#bg-linear)" />

  <!-- Stylized diamond/jewelry icon (centered) -->
  <g transform="translate(200, 220)">
    <!-- Diamond body -->
    <path
      d="M0,-50 L40,-10 L30,50 L-30,50 L-40,-10 Z"
      fill="url(#diamond-gradient)"
      opacity="0.9"
    />
    <!-- Facets for shine effect -->
    <path d="M0,-50 L0,50" stroke="white" stroke-width="2" opacity="0.5" />
    <path d="M-30,-20 L30,-20" stroke="white" stroke-width="1.5" opacity="0.4" />
    <path d="M-20,10 L20,10" stroke="white" stroke-width="1.5" opacity="0.4" />

    <!-- Decorative sparkles around (girly style) -->
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

  <!-- "Photo a venir" text -->
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

  <!-- Decorative subtext -->
  <text
    x="200"
    y="355"
    font-family="'Inter', sans-serif"
    font-size="14"
    fill="oklch(0.45 0.03 10)"
    text-anchor="middle"
    opacity="0.7"
  >
    ✨ Produit en préparation ✨
  </text>
</svg>
`,
	"utf-8"
).toString("base64")}`;

/**
 * Default alt text for the fallback image
 */
export const FALLBACK_IMAGE_ALT = "Photo du produit à venir - En préparation";

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
