/**
 * Types pour les formulaires SKU
 */

// ============================================================================
// MEDIA DATA TYPES
// ============================================================================

export type MediaData = {
	url: string;
	thumbnailUrl: string | undefined;
	blurDataUrl: string | undefined;
	altText: string | undefined;
	mediaType: "IMAGE" | "VIDEO";
};

// ============================================================================
// FORM VALUES TYPES
// ============================================================================

export type UpdateProductSkuFormValues = {
	skuId: string;
	priceInclTaxEuros: number;
	compareAtPriceEuros: number | undefined;
	inventory: number;
	isDefault: boolean;
	isActive: boolean;
	colorId: string;
	materialId: string;
	size: string;
	primaryImage: MediaData | undefined;
	galleryMedia: MediaData[];
};
