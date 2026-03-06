export type ProductMedia = {
	id: string;
	url: string;
	thumbnailUrl?: string | null; // Thumbnail for videos (poster)
	alt: string;
	blurDataUrl?: string;
	/**
	 * Origin of this media item within the gallery, set by gallery-builder.service.ts:
	 * - `"default"` — fallback from the product's default media (no SKU-specific media)
	 * - `"selected"` — media associated with the currently selected SKU variant (color/material match)
	 * - `"sku"` — media directly attached to a specific SKU record
	 *
	 * Used by the gallery to determine display priority and active state.
	 */
	source?: "default" | "selected" | "sku";
	skuId?: string;
	mediaType: "IMAGE" | "VIDEO";
};
