import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";

export type StockVariant = "destructive" | "warning" | "success";

export function getStockVariant(stock: number): StockVariant {
	if (stock === 0) return "destructive";
	if (stock <= STOCK_THRESHOLDS.LOW) return "warning";
	return "success";
}

export function getStockAriaLabel(stock: number): string {
	if (stock === 0) return "Stock épuisé";
	if (stock <= STOCK_THRESHOLDS.LOW) return `Stock faible : ${stock} disponible(s)`;
	return `${stock} en stock`;
}

/**
 * Libellé court de statut affiché dans les badges (Rupture / Faible / OK).
 * SSOT partagée entre la carte détail VARIANT et la preview du formulaire d'ajustement.
 */
export function getStockStatusLabel(stock: number): string {
	if (stock === 0) return "Rupture";
	if (stock <= STOCK_THRESHOLDS.LOW) return "Faible";
	return "OK";
}
