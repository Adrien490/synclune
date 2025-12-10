/**
 * Types pour les listes de produits (ProductCard, carousels, etc.)
 * Ces types travaillent avec les données minimales de get-products
 */

import type { GetProductsReturn } from "@/modules/products/data/get-products";

/** Produit tel que retourné par getProducts (données minimales pour listes) */
export type ProductFromList = GetProductsReturn["products"][0];

/** SKU tel que retourné dans ProductFromList */
export type SkuFromList = ProductFromList["skus"][0];

/** Type pour les pastilles couleur sur ProductCard */
export type ColorSwatch = {
	slug: string;
	hex: string;
	name: string;
	inStock: boolean;
};
