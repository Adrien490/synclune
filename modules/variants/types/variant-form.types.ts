/**
 * Types pour les formulaires de variante — schéma lean (lot 2) : plus de média
 * sur la variante (le média vit sur le produit), plus de compareAtPrice, une
 * seule couleur / un seul matériau (FK), plus de `isDefault`.
 */

// ============================================================================
// FORM VALUES TYPES
// ============================================================================

export type UpdateProductVariantFormValues = {
	variantId: string;
	/** Override du prix produit en euros — vide = hérite du prix produit. */
	priceEuros: number | "";
	stock: number;
	// String "true" | "false" pour matcher les options du RadioGroupField
	// (useFieldContext<string>). La conversion vers boolean est faite dans
	// l'action via `formData.get("active") === "true"`.
	active: "true" | "false";
	/** Couleur (FK) — vide = aucune couleur. */
	colorId: string;
	/** Matériau (FK) — vide = aucun matériau. */
	materialId: string;
	size: string;
};

export type CreateProductVariantFormValues = Omit<UpdateProductVariantFormValues, "variantId"> & {
	productId: string;
};
