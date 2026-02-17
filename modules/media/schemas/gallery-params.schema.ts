// ============================================================================
// GALLERY URL PARAMS VALIDATION
// ============================================================================
// NOTE: Validation without Zod to avoid HMR Turbopack errors in
// client components. Zod v4 is not compatible with "use client" + Turbopack.

export interface GalleryParams {
	color?: string;
	material?: string;
	size?: string;
}

const VARIANT_SLUG_REGEX = /^[a-z0-9-]+$/;
const MAX_SLUG_LENGTH = 50;
const MAX_SIZE_LENGTH = 20;
const SIZE_REGEX = /^[a-zA-Z0-9.,/ -]+$/;

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
 * Validates gallery parameters (URL query params).
 * Returns validated values or undefined for invalid values.
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
