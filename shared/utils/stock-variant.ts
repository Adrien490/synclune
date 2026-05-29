import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";

export type StockVariant = "destructive" | "warning" | "success";

export function getStockVariant(inventory: number): StockVariant {
	if (inventory === 0) return "destructive";
	if (inventory <= STOCK_THRESHOLDS.LOW) return "warning";
	return "success";
}

export function getStockAriaLabel(inventory: number): string {
	if (inventory === 0) return "Stock épuisé";
	if (inventory <= STOCK_THRESHOLDS.LOW) return `Stock faible : ${inventory} disponible(s)`;
	return `${inventory} en stock`;
}

/**
 * Libellé court de statut affiché dans les badges (Rupture / Faible / OK).
 * SSOT partagée entre la carte détail SKU et la preview du formulaire d'ajustement.
 */
export function getStockStatusLabel(inventory: number): string {
	if (inventory === 0) return "Rupture";
	if (inventory <= STOCK_THRESHOLDS.LOW) return "Faible";
	return "OK";
}
