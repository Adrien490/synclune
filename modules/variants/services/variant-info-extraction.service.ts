/**
 * Extraction des informations de variantes d'un produit — schéma lean (lot 2) :
 * une variante porte UNE couleur et UN matériau (FK nullables), le prix est
 * `variant.priceCents ?? product.priceCents`.
 */
import { slugify } from "@/shared/utils/generate-slug";
import type { BaseProductVariant, ProductVariantInfo } from "@/shared/types/product-variant.types";

/**
 * Extrait les informations complètes sur les variantes disponibles.
 *
 * `productPriceCents` : prix de base du produit — utilisé quand l'override de
 * la variante est null (le priceRange doit refléter le prix RÉEL affiché).
 */
export function extractVariantInfo<
	TVariant extends BaseProductVariant,
	TProduct extends { variants?: TVariant[] | null; priceCents?: number },
>(product: TProduct): ProductVariantInfo {
	const activeVariants = product.variants?.filter((variant: TVariant) => variant.active) ?? [];
	const basePrice = product.priceCents ?? 0;

	const colorMap = new Map<string, { hex?: string; slug?: string; name: string; count: number }>();
	const materialMap = new Map<string, { name: string; count: number }>();
	const sizeMap = new Map<string, number>();

	let minPrice = Infinity;
	let maxPrice = -Infinity;
	let totalStock = 0;

	for (const variant of activeVariants) {
		// Couleur (FK). Fallback métier conservé : une variante sans couleur mais
		// avec un matériau expose le matériau comme « couleur » pour piloter le
		// sélecteur (identité unique de variante côté UX).
		const color = variant.color;
		const materialName = variant.material?.name;

		if (color) {
			const colorKey = slugify(color.name);
			const existing = colorMap.get(colorKey) ?? { name: color.name, count: 0 };
			colorMap.set(colorKey, {
				hex: color.hex ?? undefined,
				slug: colorKey,
				name: color.name,
				count: existing.count + 1,
			});
		} else if (materialName) {
			const materialSlug = slugify(materialName);
			const existing = colorMap.get(materialSlug) ?? { name: materialName, count: 0 };
			colorMap.set(materialSlug, {
				hex: existing.hex,
				slug: materialSlug,
				name: materialName,
				count: existing.count + 1,
			});
		}

		if (materialName) {
			const mapKey = materialName.toLowerCase();
			const existingMaterial = materialMap.get(mapKey) ?? { name: materialName, count: 0 };
			materialMap.set(mapKey, { name: materialName, count: existingMaterial.count + 1 });
		}

		if (variant.size) {
			sizeMap.set(variant.size, (sizeMap.get(variant.size) ?? 0) + 1);
		}

		const effectivePrice = variant.priceCents ?? basePrice;
		minPrice = Math.min(minPrice, effectivePrice);
		maxPrice = Math.max(maxPrice, effectivePrice);

		totalStock += variant.stock;
	}

	return {
		availableColors: Array.from(colorMap.entries()).map(([key, value]) => ({
			id: key,
			slug: value.slug,
			hex: value.hex,
			name: value.name,
			availableVariants: value.count,
		})),
		availableMaterials: Array.from(materialMap.values()).map(({ name, count }) => ({
			name,
			availableVariants: count,
		})),
		availableSizes: Array.from(sizeMap.entries()).map(([size, count]) => ({
			size,
			availableVariants: count,
		})),
		priceRange: {
			min: minPrice === Infinity ? 0 : minPrice,
			max: maxPrice === -Infinity ? 0 : maxPrice,
		},
		totalStock,
	};
}

/**
 * Le sélecteur de taille est-il rendu pour ce produit ?
 *
 * SSOT du prédicat, appelée par `useVariantValidation` (client) ET par la PDP
 * (serveur, squelette). Le critère « type de produit » a disparu avec
 * ProductType (lot 2) : la présence de tailles non « ajustables » suffit.
 */
export function requiresSizeSelection<
	TVariant extends BaseProductVariant,
	TProduct extends { variants?: TVariant[] | null; priceCents?: number },
>(product: TProduct, variantInfo?: ProductVariantInfo): boolean {
	const info = variantInfo ?? extractVariantInfo(product);
	const variantCount = product.variants?.length ?? 0;
	const hasAdjustableSizes = info.availableSizes.some((s) =>
		s.size.toLowerCase().includes("ajustable"),
	);

	return variantCount > 1 && !hasAdjustableSizes && info.availableSizes.length > 0;
}
