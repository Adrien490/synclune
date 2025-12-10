/**
 * Types pour la sélection et le calcul de stock des SKUs
 */

/** Statut de stock simplifié */
export type StockStatus = "in_stock" | "out_of_stock";

/** Informations de stock d'un produit */
export type ProductStockInfo = {
	status: StockStatus;
	totalInventory: number;
	availableSkus: number;
	message: string;
};
