import type {
	StockAlertItem,
	StockAlertType,
	SkuForStockAlert,
} from "../types/dashboard.types";

export type { StockAlertType, SkuForStockAlert } from "../types/dashboard.types";

// ============================================================================
// STOCK ALERT CLASSIFIER SERVICE
// Pure functions for classifying stock alerts
// ============================================================================

/**
 * Détermine le type d'alerte en fonction du niveau d'inventaire
 *
 * @param inventory - Niveau d'inventaire
 * @returns Type d'alerte (rupture ou stock faible)
 */
export function classifyStockAlert(inventory: number): StockAlertType {
	return inventory === 0 ? "out_of_stock" : "low_stock";
}

/**
 * Transforme un SKU brut en alerte de stock formatée
 *
 * @param sku - SKU avec données produit
 * @returns Alerte de stock formatée
 */
export function transformSkuToStockAlert(sku: SkuForStockAlert): StockAlertItem {
	return {
		skuId: sku.id,
		sku: sku.sku,
		productTitle: sku.product.title,
		inventory: sku.inventory,
		alertType: classifyStockAlert(sku.inventory),
	};
}

/**
 * Transforme une liste de SKUs en alertes de stock
 *
 * @param skus - Liste de SKUs
 * @returns Liste d'alertes de stock
 */
export function transformSkusToStockAlerts(
	skus: SkuForStockAlert[]
): StockAlertItem[] {
	return skus.map(transformSkuToStockAlert);
}
