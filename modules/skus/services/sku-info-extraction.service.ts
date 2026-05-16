import { getSwatchAriaLabel } from "@/modules/colors/utils/swatch-style";
import { slugify } from "@/shared/utils/generate-slug";
import type {
	BaseProductSku,
	ColorCombo,
	ProductVariantInfo,
} from "@/shared/types/product-sku.types";

/**
 * Construit la clé canonique d'une combinaison de slugs (ordre indépendant).
 *
 * @example
 * buildComboKey(["or-rose", "argent"]) === buildComboKey(["argent", "or-rose"])
 * // → "argent__or-rose"
 */
export function buildComboKey(slugs: ReadonlyArray<string>): string {
	return [...slugs].sort((a, b) => a.localeCompare(b)).join("__");
}

/**
 * Extrait les combinaisons de couleurs M2M portées par les SKUs actifs.
 *
 * Convention :
 * - L'ordre des couleurs dans chaque combo respecte `position` (1ère = principale).
 * - Le `comboKey` est calculé sur slugs triés alphabétiquement → stable et
 *   indépendant de l'ordre des SKUs sources.
 * - Un combo est `inStock` si AU MOINS un SKU le portant a `inventory > 0`.
 * - Les SKUs sans couleur ne produisent pas de combo (ils restent dans
 *   `availableColors` via fallback matériau).
 */
export function extractColorCombos<
	TSku extends BaseProductSku,
	TProduct extends { skus?: TSku[] | null },
>(product: TProduct): ColorCombo[] {
	const activeSkus = product.skus?.filter((sku) => sku.isActive) ?? [];
	const combos = new Map<string, ColorCombo>();

	for (const sku of activeSkus) {
		const skuColors = sku.colors ?? [];
		if (skuColors.length === 0) continue;

		const orderedColors = [...skuColors].sort((a, b) => a.position - b.position);
		const slugs = orderedColors.map((link) => link.color.slug).filter(Boolean);
		if (slugs.length === 0) continue;

		const comboKey = buildComboKey(slugs);
		const existing = combos.get(comboKey);

		if (existing) {
			combos.set(comboKey, {
				...existing,
				inStock: existing.inStock || sku.inventory > 0,
				skuCount: existing.skuCount + 1,
			});
			continue;
		}

		const colors = orderedColors.map((link) => ({
			id: link.color.id,
			slug: link.color.slug,
			hex: link.color.hex,
			name: link.color.name,
			position: link.position,
		}));
		const hexes = colors.map((c) => c.hex);
		const names = colors.map((c) => c.name);

		combos.set(comboKey, {
			comboKey,
			colors,
			hexes,
			names,
			label: names.join(" + "),
			ariaLabel: getSwatchAriaLabel(names),
			inStock: sku.inventory > 0,
			skuCount: 1,
		});
	}

	return Array.from(combos.values());
}

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
		// Fallback métier : si AUCUNE couleur n'est rattachée à un SKU mais qu'il a
		// AU MOINS un matériau, on expose UNIQUEMENT le matériau principal (position=0)
		// comme « couleur » pour piloter le sélecteur. Les matériaux secondaires
		// restent visibles dans le sélecteur Matériau séparé — la couleur de fallback
		// reste un identifiant *unique* de variante côté UX (cohérent avec « 1ère
		// teinte = principale » de la convention M2M).
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
		availableCombos: extractColorCombos(product),
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
