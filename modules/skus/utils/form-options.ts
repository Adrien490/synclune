/**
 * Utilitaires pour les formulaires SKU
 */

import type { SkuWithImages } from "../data/get-sku";
import type { MediaData, UpdateProductSkuFormValues } from "../types/sku-form.types";

/**
 * Génère les options du formulaire d'édition de SKU avec les valeurs pré-remplies.
 *
 * Les images sont déjà triées par `(position asc, id asc)` côté data layer
 * (getSkuById). On préserve cet ordre dans le tableau unifié `media[]`
 * (1er item = principal — le rang EST l'information, `isPrimary` n'existe plus).
 */
export function getUpdateProductSkuFormOpts(sku: SkuWithImages) {
	const media: MediaData[] = sku.images.map((img) => ({
		url: img.url,
		thumbnailUrl: img.thumbnailUrl ?? undefined,
		blurDataUrl: img.blurDataUrl ?? undefined,
		altText: img.altText ?? undefined,
		mediaType: img.mediaType,
		// L'action fait deleteMany + recréation : omettre les dimensions ici les
		// remettait à NULL à chaque édition de variante.
		width: img.width,
		height: img.height,
	}));

	return {
		defaultValues: {
			skuId: sku.id,
			priceInclTaxEuros: sku.priceInclTax / 100, // Centimes → Euros
			compareAtPriceEuros: sku.compareAtPrice ? sku.compareAtPrice / 100 : undefined,
			inventory: sku.inventory,
			// Champ de formulaire (intention « faire de cette variante le représentant »),
			// pré-rempli depuis le rang calculé par fetchSkuById — la colonne `isDefault`
			// n'existe plus (audit schéma V5, lot A2).
			isDefault: sku.isRepresentative,
			// String pour le RadioGroupField (cf. UpdateProductSkuFormValues.isActive).
			isActive: sku.isActive ? "true" : "false",
			// Couleurs M2M ordonnées (1re = principale). Préserve l'ordre saisi côté admin.
			colorIds: sku.colors.map((c) => c.colorId),
			// Matériaux M2M ordonnés (1er = principal). Préserve l'ordre saisi côté admin.
			materialIds: sku.materials.map((m) => m.materialId),
			size: sku.size ?? "",
			media,
		} satisfies UpdateProductSkuFormValues,
	};
}
