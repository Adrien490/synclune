import { findSkuByVariants } from "@/modules/skus/services/sku-variant-finder.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";

/**
 * Teinte de la galerie, dérivée de la couleur de la variante affichée.
 *
 * Le cadre de la galerie reprend la couleur du bijou qu'on regarde : changer de
 * variante repeint la galerie, pas seulement la photo. La teinte n'est employée
 * qu'en **halo, ruban de tape et trait** — jamais en encre, un `hex` client
 * arbitraire n'offrant aucune garantie de contraste.
 *
 * D'où la normalisation : les hex du catalogue vont de `#E8F4F8` (cristal,
 * quasi blanc) à `#1A1A1A` (noir). Posés tels quels, le premier est invisible
 * et le second lit comme une ombre portée sale. On ramène donc la clarté dans
 * une plage utilisable et on borne la chroma, en espace **OKLCh** — le même que
 * les tokens de `app/globals.css`.
 */

/** Clarté minimale : en dessous, la teinte lit comme une ombre sale. */
const MIN_LIGHTNESS = 0.62;
/** Clarté maximale : au-dessus, la teinte disparaît sur le fond `--background`. */
const MAX_LIGHTNESS = 0.84;
/** Chroma plafond : au-delà, l'aplat crie plus fort que la photo. */
const MAX_CHROMA = 0.16;
/** Chroma plancher appliqué UNIQUEMENT à une couleur qui a déjà une teinte. */
const MIN_CHROMA = 0.07;
/**
 * En dessous de ce seuil, la couleur est achromatique (noir, blanc, argent) :
 * sa teinte n'existe pas, et la remonter reviendrait à l'inventer. On garde
 * alors un gris — un bijou argenté donne un carton neutre, ce qui est juste.
 */
const ACHROMATIC_CHROMA = 0.012;

const HEX_PATTERN = /^#?([0-9a-f]{6})$/i;

function srgbChannelToLinear(channel: number): number {
	return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Convertit un hex `#RRGGBB` en `oklch(L C H)` normalisé, ou `null` si le hex
 * est illisible (colonne `VarChar(7)` non nullable en base, mais les services
 * voisins traitent déjà `hex` comme potentiellement falsy).
 *
 * Matrices de Björn Ottosson (sRGB linéaire → LMS → OKLab).
 */
export function normalizeAccentHex(hex: string | null | undefined): string | null {
	if (!hex) return null;

	const match = HEX_PATTERN.exec(hex.trim());
	const digits = match?.[1];
	if (!digits) return null;

	const value = Number.parseInt(digits, 16);
	const r = srgbChannelToLinear(((value >> 16) & 0xff) / 255);
	const g = srgbChannelToLinear(((value >> 8) & 0xff) / 255);
	const b = srgbChannelToLinear((value & 0xff) / 255);

	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

	const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

	const chroma = Math.hypot(okA, okB);
	const hue = ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360;

	const normalizedLightness = clamp(okL, MIN_LIGHTNESS, MAX_LIGHTNESS);
	const normalizedChroma = chroma < ACHROMATIC_CHROMA ? 0 : clamp(chroma, MIN_CHROMA, MAX_CHROMA);

	// Une couleur achromatique n'a pas de teinte : on ne publie pas d'angle
	// arbitraire, `oklch(L 0 0)` reste un gris quelle que soit la lecture.
	const normalizedHue = normalizedChroma === 0 ? 0 : hue;

	return `oklch(${normalizedLightness.toFixed(3)} ${normalizedChroma.toFixed(3)} ${normalizedHue.toFixed(1)})`;
}

interface ResolveGalleryAccentOptions {
	product: GetProductReturn;
	selectedVariants: {
		colorCombo?: string;
		colorSlug?: string;
		materialSlug?: string;
		size?: string;
	};
}

/**
 * Teinte de la galerie pour la variante affichée, ou `null` si le produit n'a
 * aucune couleur exploitable (l'appelant retombe alors sur `--primary`).
 *
 * ⚠️ La résolution du SKU **mirroir celle de `buildGallery`** (SKU des variantes
 * sélectionnées, sinon premier SKU actif) : les deux doivent désigner le même
 * bijou, sinon le cadre serait teinté de la couleur d'une autre photo.
 * Verrouillé par `gallery-accent.service.test.ts`.
 */
export function resolveGalleryAccent({
	product,
	selectedVariants,
}: ResolveGalleryAccentOptions): string | null {
	const { colorCombo, colorSlug, materialSlug, size } = selectedVariants;

	const selectedSku =
		colorCombo || colorSlug || materialSlug || size
			? findSkuByVariants(product, { colorCombo, colorSlug, materialSlug, size })
			: null;

	const sku = selectedSku ?? product.skus[0] ?? null;
	if (!sku) return null;

	// `?color=` est tolérant any-of sur le M2M : un SKU bicolore matche un slug
	// unique. On prend donc la couleur DEMANDÉE quand elle existe, pas `colors[0]`
	// — sinon un « or-rose + argent » sélectionné par `?color=argent` se
	// teinterait en rose.
	const requested = colorSlug
		? sku.colors.find((link) => link.color.slug === colorSlug)
		: undefined;

	// À défaut, la couleur de position 0 (le select Prisma ordonne par `position`).
	return normalizeAccentHex((requested ?? sku.colors[0])?.color.hex);
}
