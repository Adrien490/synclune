/**
 * Types pour les formulaires SKU
 */

// ============================================================================
// MEDIA DATA TYPES
// ============================================================================

/**
 * Média dans un formulaire SKU.
 *
 * Aligné sur `MediaArrayFieldValue` côté produit pour partage des composants
 * media-array-card. Relation avec ParsedMedia (sku.types.ts) : même structure,
 * mais les champs optionnels sont ici required-but-undefined (stricte
 * compatibilité TanStack Form) et thumbnailUrl autorise null (les uploads de
 * vidéos retournent null si la miniature échoue).
 */
export type MediaData = {
	url: string;
	thumbnailUrl: string | null | undefined;
	blurDataUrl: string | undefined;
	altText: string | undefined;
	mediaType: "IMAGE" | "VIDEO";
	/** Dimensions intrinsèques — cf. MediaItem : chaque remap doit les porter. */
	width?: number | null;
	height?: number | null;
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
	// String "true" | "false" pour matcher les options du RadioGroupField
	// (useFieldContext<string>). La conversion vers boolean est faite dans
	// l'action via `formData.get("isActive") === "true"`.
	isActive: "true" | "false";
	/** Couleurs M2M ordonnées (1re = principale). Vide = aucune couleur. */
	colorIds: string[];
	/** Matériaux M2M ordonnés (1er = principal). Vide = aucun matériau. */
	materialIds: string[];
	size: string;
	/** Médias unifiés (1er = principal, ordre = position). Cap : ARRAY_LIMITS.SKU_MEDIA. */
	media: MediaData[];
};
