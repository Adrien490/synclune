export function getProductTotalStock(skus: ReadonlyArray<{ inventory: number }>): number {
	return skus.reduce((sum, sku) => sum + (sku.inventory || 0), 0);
}
