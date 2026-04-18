import type { ProductCarouselItem } from "@/modules/products/types/product.types";

/**
 * Donnees passees au dialog de selection de SKU
 *
 * Typé avec ProductCarouselItem (sous-ensemble de Product) — un Product complet
 * reste assignable via typage structurel. Le dialog n'accède pas aux champs
 * lourds (description / collections / _count).
 */
export type SkuSelectorDialogData = {
	product: ProductCarouselItem;
	/** Couleur pre-selectionnee depuis les swatches de la ProductCard */
	preselectedColor?: string | null;
	[key: string]: unknown;
};
