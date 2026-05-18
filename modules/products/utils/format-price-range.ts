import { formatEuro } from "@/shared/utils/format-euro";

import type { PriceInfo } from "../types/product-services.types";

const isEmpty = (priceInfo: PriceInfo) =>
	priceInfo.minPrice === 0 && priceInfo.maxPrice === 0 && !priceInfo.hasMultiplePrices;

export function formatPriceRangeDisplay(priceInfo: PriceInfo): string {
	if (isEmpty(priceInfo)) return "—";
	if (!priceInfo.hasMultiplePrices) return formatEuro(priceInfo.minPrice);
	return `${formatEuro(priceInfo.minPrice)} - ${formatEuro(priceInfo.maxPrice)}`;
}

export function formatPriceRangeAriaLabel(priceInfo: PriceInfo): string {
	if (isEmpty(priceInfo)) return "Prix non défini";
	if (!priceInfo.hasMultiplePrices) return `Prix : ${formatEuro(priceInfo.minPrice)}`;
	return `Prix : de ${formatEuro(priceInfo.minPrice)} à ${formatEuro(priceInfo.maxPrice)}`;
}
