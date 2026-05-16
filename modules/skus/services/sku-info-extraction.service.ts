import { slugify } from "@/shared/utils/generate-slug";
import type { BaseProductSku, ProductVariantInfo } from "@/shared/types/product-sku.types";

/**
 * Extrait les informations complètes sur les variantes disponibles
 */
export function extractVariantInfo<
	TSku extends BaseProductSku,
	TProduct extends { skus?: TSku[] | null },
>(product: TProduct): ProductVariantInfo {
	const activeSkus = product.skus?.filter((sku: TSku) => sku.isActive) ?? [];

	// Couleurs disponibles
	const colorMap = new Map<string, { hex?: string; slug?: string; name: string; count: number }>();

	// Matériaux disponibles
	const materialMap = new Map<string, { name: string; count: number }>();

	// Tailles disponibles
	const sizeMap = new Map<string, number>();

	// Prix min/max
	let minPrice = Infinity;
	let maxPrice = -Infinity;
	let totalStock = 0;

	for (const sku of activeSkus) {
		// Couleurs M2M : on agrège chaque couleur unique vue dans les SKUs.
		// Fallback métier : si AUCUNE couleur n'est rattachée à un SKU mais qu'il a un
		// matériau principal (ex. bijoux argent uniquement), on expose le matériau
		// principal (position=0) comme "couleur" pour piloter le sélecteur.
		const skuColors = sku.colors ?? [];
		const primaryMaterialName = sku.materials?.[0]?.material.name ?? undefined;

		if (skuColors.length > 0) {
			for (const link of skuColors) {
				const c = link.color;
				const colorKey = c.slug ?? c.id;
				const existing = colorMap.get(colorKey) ?? { name: c.name, count: 0 };
				colorMap.set(colorKey, {
					hex: c.hex ?? existing.hex,
					slug: c.slug ?? colorKey,
					name: c.name,
					count: existing.count + 1,
				});
			}
		} else if (primaryMaterialName) {
			const materialSlug = slugify(primaryMaterialName);
			const existing = colorMap.get(materialSlug) ?? { name: primaryMaterialName, count: 0 };
			colorMap.set(materialSlug, {
				hex: existing.hex,
				slug: materialSlug,
				name: primaryMaterialName,
				count: existing.count + 1,
			});
		}

		// Matériaux (un SKU peut en compter plusieurs ; chaque matériau augmente availableSkus)
		for (const entry of sku.materials ?? []) {
			const materialName = entry.material.name;
			const mapKey = materialName.toLowerCase();
			const existingMaterial = materialMap.get(mapKey) ?? {
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
			sizeMap.set(sku.size, (sizeMap.get(sku.size) ?? 0) + 1);
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
		availableMaterials: Array.from(materialMap.values()).map(({ name, count }) => ({
			name,
			availableSkus: count,
		})),
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
