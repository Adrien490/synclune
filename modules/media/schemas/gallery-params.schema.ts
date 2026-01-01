// ============================================================================
// GALLERY URL PARAMS VALIDATION
// ============================================================================
// NOTE: Validation sans Zod pour éviter les erreurs HMR Turbopack dans les
// composants client. Zod v4 n'est pas compatible avec "use client" + Turbopack.

export interface GalleryParams {
	color?: string;
	material?: string;
	size?: string;
}

const VARIANT_SLUG_REGEX = /^[a-z0-9-]+$/;
const MAX_SLUG_LENGTH = 50;
const MAX_SIZE_LENGTH = 20;

/**
 * Valide un slug de variante (color/material)
 */
function validateVariantSlug(value: string | undefined): string | undefined {
	if (!value) return undefined;
	if (value.length > MAX_SLUG_LENGTH) return undefined;
	if (!VARIANT_SLUG_REGEX.test(value)) return undefined;
	return value;
}

/**
 * Valide un paramètre size
 */
function validateSize(value: string | undefined): string | undefined {
	if (!value) return undefined;
	if (value.length > MAX_SIZE_LENGTH) return undefined;
	return value;
}

/**
 * Valide les paramètres de galerie (query params URL)
 * Retourne les valeurs validées ou undefined pour les valeurs invalides
 */
export function parseGalleryParams(params: {
	color?: string;
	material?: string;
	size?: string;
}): GalleryParams {
	return {
		color: validateVariantSlug(params.color),
		material: validateVariantSlug(params.material),
		size: validateSize(params.size),
	};
}
