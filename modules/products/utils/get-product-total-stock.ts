export function getProductTotalStock(variants: ReadonlyArray<{ stock: number }>): number {
	return variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
}
