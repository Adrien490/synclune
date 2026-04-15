/**
 * Types pour les formulaires SKU
 */

// ============================================================================
// MEDIA DATA TYPES
// ============================================================================

/**
 * Média dans un formulaire SKU.
 *
 * Relation avec ParsedMedia (sku.types.ts) : même structure, mais les champs
 * optionnels sont ici required-but-undefined (stricte compatibilité TanStack Form)
 * et thumbnailUrl est non-nullable (les uploads ne produisent jamais null).
 * ParsedMedia est l'équivalent côté serveur pour le parsing des FormData JSON.
 */
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
