import type { Product } from "@/modules/products/types/product.types";

/**
 * Donnees passees au dialog de selection de SKU
 */
export type SkuSelectorDialogData = {
	product: Product;
	/** Couleur pre-selectionnee depuis les swatches de la ProductCard */
	preselectedColor?: string | null;
	[key: string]: unknown;
};
