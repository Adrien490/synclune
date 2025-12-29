import { slugify } from "@/shared/utils/generate-slug";
import type {
	BaseProductSku,
	ProductVariantInfo,
} from "@/shared/types/product-sku.types";

/**
 * Extrait les informations complètes sur les variantes disponibles
 */
export function extractVariantInfo<
	TSku extends BaseProductSku,
	TProduct extends { skus?: TSku[] | null }
>(product: TProduct): ProductVariantInfo {
	const activeSkus = product.skus?.filter((sku: TSku) => sku.isActive) || [];

	// Couleurs disponibles
	const colorMap = new Map<
		string,
		{ hex?: string; slug?: string; name: string; count: number }
	>();

	// Matériaux disponibles
	const materialMap = new Map<string, { name: string; count: number }>();

	// Tailles disponibles
	const sizeMap = new Map<string, number>();

	// Prix min/max
	let minPrice = Infinity;
	let maxPrice = -Infinity;
	let totalStock = 0;

	for (const sku of activeSkus) {
		// Couleurs avec fallback sur le matériau pour différencier les variantes
		const materialName = sku.material?.name || undefined;

		if (sku.color || materialName) {
			// Utiliser le slug comme clé principale (URL-friendly)
			const colorKey = sku.color?.slug
				? sku.color.slug
				: materialName
					? slugify(materialName)
					: "default";
			const colorName = sku.color?.name || materialName || "Standard";
			const existing = colorMap.get(colorKey) || { name: colorName, count: 0 };
			colorMap.set(colorKey, {
				hex: sku.color?.hex || existing.hex,
				slug: sku.color?.slug || colorKey, // Toujours un slug
				name: colorName,
				count: existing.count + 1,
			});
		}

		// Matériaux
		if (materialName) {
			const mapKey = materialName.toLowerCase();
			const existingMaterial = materialMap.get(mapKey) || {
				name: materialName,
				count: 0,
			};
			materialMap.set(mapKey, {
				name: materialName,
				count: existingMaterial.count + 1,
			});
		}

		// Tailles (si applicable)
		if (sku.size) {
			sizeMap.set(sku.size, (sizeMap.get(sku.size) || 0) + 1);
		}

		// Prix
		minPrice = Math.min(minPrice, sku.priceInclTax);
		maxPrice = Math.max(maxPrice, sku.priceInclTax);

		// Stock
		totalStock += sku.inventory;
	}

	return {
		availableColors: Array.from(colorMap.entries()).map(([key, value]) => ({
			id: key, // Le slug est maintenant la clé primaire
			slug: value.slug,
			hex: value.hex,
			name: value.name,
			availableSkus: value.count,
		})),
		availableMaterials: Array.from(materialMap.values()).map(
			({ name, count }) => ({
				name,
				availableSkus: count,
			})
		),
		availableSizes: Array.from(sizeMap.entries()).map(([size, count]) => ({
			size,
			availableSkus: count,
		})),
		priceRange: {
			min: minPrice === Infinity ? 0 : minPrice,
			max: maxPrice === -Infinity ? 0 : maxPrice,
		},
		totalStock,
	};
}
