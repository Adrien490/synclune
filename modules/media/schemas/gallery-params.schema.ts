// ============================================================================
// GALLERY URL PARAMS VALIDATION
// ============================================================================
// NOTE: Validation sans Zod — Zod v4 + "use client" + Turbopack cassait le
// HMR au moment de l'écriture. La validation manuelle est correcte et testée
// (fail-open en `undefined`, bornes + regex ancrées) ; re-tenter Zod ici est
// un confort, pas un besoin — à réévaluer à l'occasion d'un bump majeur de
// Next ou de Zod, pas avant.

interface GalleryParams {
	color?: string;
	material?: string;
	size?: string;
	variant?: string;
}

const VARIANT_SLUG_REGEX = /^[a-z0-9-]+$/;
const MAX_SLUG_LENGTH = 50;
const MAX_SIZE_LENGTH = 20;
const SIZE_REGEX = /^[a-zA-Z0-9.,/ -]+$/;
// Combo key = slugs trié·s alphabétiquement joints par "__" (cf. buildComboKey)
const VARIANT_COMBO_REGEX = /^[a-z0-9-]+(?:__[a-z0-9-]+)*$/;
const MAX_COMBO_LENGTH = 150;

/**
 * Validates a variant slug (color/material)
 */
function validateVariantSlug(value: string | undefined): string | undefined {
	if (!value) return undefined;
	if (value.length > MAX_SLUG_LENGTH) return undefined;
	if (!VARIANT_SLUG_REGEX.test(value)) return undefined;
	return value;
}

/**
 * Validates a size parameter (alphanumeric with common size separators)
 */
function validateSize(value: string | undefined): string | undefined {
	if (!value) return undefined;
	if (value.length > MAX_SIZE_LENGTH) return undefined;
	if (!SIZE_REGEX.test(value)) return undefined;
	return value;
}

/**
 * Validates a variant combo key (slugs joined by "__")
 */
function validateVariantCombo(value: string | undefined): string | undefined {
	if (!value) return undefined;
	if (value.length > MAX_COMBO_LENGTH) return undefined;
	if (!VARIANT_COMBO_REGEX.test(value)) return undefined;
	return value;
}

/**
 * Validates gallery parameters (URL query params).
 * Returns validated values or undefined for invalid values.
 */
export function parseGalleryParams(params: {
	color?: string;
	material?: string;
	size?: string;
	variant?: string;
}): GalleryParams {
	return {
		color: validateVariantSlug(params.color),
		material: validateVariantSlug(params.material),
		size: validateSize(params.size),
		variant: validateVariantCombo(params.variant),
	};
}
