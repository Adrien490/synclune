import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import { getPrimaryImageForList } from "@/modules/products/services/product-display.service";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { SKU_SELECTOR_TEXTS } from "@/modules/cart/constants/sku-selector-texts";

// ============================================================================
// Types
// ============================================================================

export type ActiveSku = NonNullable<ProductCarouselItem["skus"]>[number];

/**
 * Pas de champ `alt` : la vignette d'une ligne est DÉCORATIVE. Le bouton porte un
 * `aria-label` complet (combinaison, prix, stock), qui écrase de toute façon le
 * contenu — un `alt` y serait inerte, et le dupliquer inviterait à le laisser
 * diverger.
 */
export interface ImageSelection {
	url: string;
	blurDataUrl: string | null;
}

/** Dimensions qui distinguent réellement les pièces les unes des autres. */
export interface DistinguishingDimensions {
	color: boolean;
	material: boolean;
}

export type StockTone = "available" | "low" | "maxed" | "sold-out";

export interface StockDescription {
	tone: StockTone;
	label: string;
	/** Rien à ajouter au panier : la pièce ne peut pas être choisie. */
	isBlocked: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** ID for aria-describedby on quantity input bounds */
export const QUANTITY_BOUNDS_ID = "sku-selector-quantity-bounds";

/**
 * ⚠️ SSOT de l'identifiant du dialog. Il vit dans ce module FEUILLE (pas dans
 * `sku-selector-dialog.tsx`) parce que `add-to-cart-card-button.tsx`, rendu sur
 * chaque carte de la grille, en a besoin : l'importer du dialog tirait tout son
 * graphe (motion, ResponsiveDialog) dans le bundle du catalogue.
 */
export const SKU_SELECTOR_DIALOG_ID = "sku-selector";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Dimensions qui varient d'une pièce à l'autre.
 *
 * Une dimension identique partout n'apprend rien sur une ligne : elle est
 * silencieuse. La TAILLE, elle, n'est jamais filtrée par ce calcul — cf.
 * `buildPieceLabel`.
 */
export function getDistinguishingDimensions(activeSkus: ActiveSku[]): DistinguishingDimensions {
	const colorKeys = new Set<string>();
	const materialKeys = new Set<string>();

	for (const sku of activeSkus) {
		colorKeys.add(sku.colors.map((link) => link.color.name).join("|"));
		materialKeys.add(sku.materials.map((link) => link.material.name).join("|"));
	}

	return { color: colorKeys.size > 1, material: materialKeys.size > 1 };
}

/**
 * Libellé d'une pièce : « Cristal · taille 52 », « Lavande · Perles naturelles ».
 *
 * ⚠️ **La taille est écrite dès que le SKU en a une**, qu'elle varie ou non, et
 * qu'une constante la déclare requise ou non. C'est ce qui met le P0 hors d'état de
 * nuire : `PRODUCT_TYPES_REQUIRING_SIZE` a pointé pendant des mois vers des slugs
 * inexistants, le groupe Taille n'était jamais rendu, et le SKU envoyé au panier
 * était le premier du tableau. Ici, aucune constante ne s'interpose.
 */
export function buildPieceLabel(
	sku: ActiveSku,
	dimensions: DistinguishingDimensions,
	fallbackIndex: number,
): { text: string; size: string | null } {
	const parts: string[] = [];

	const colors = sku.colors.map((link) => link.color.name).filter(Boolean);
	const materials = sku.materials.map((link) => link.material.name).filter(Boolean);

	if (dimensions.color && colors.length > 0) parts.push(colors.join(" / "));
	if (dimensions.material && materials.length > 0) parts.push(materials.join(" / "));

	// Aucune dimension distinctive : on nomme quand même la pièce plutôt que de
	// laisser une ligne muette.
	if (parts.length === 0) {
		if (colors.length > 0) parts.push(colors.join(" / "));
		else if (materials.length > 0) parts.push(materials.join(" / "));
		else if (!sku.size) parts.push(`Pièce ${fallbackIndex + 1}`);
	}

	return {
		text: parts.join(" · "),
		size: sku.size ? `taille ${sku.size}` : null,
	};
}

/**
 * État de stock d'une pièce, compte tenu de ce qui est DÉJÀ dans le panier.
 *
 * ⚠️ Le libellé porte l'information ; la couleur du point n'est que redondance.
 * `--warning` en `text-warning` donne 2,19:1 sur `--background` — la doctrine du
 * dépôt (`cart-state-chip.tsx`) est de ne jamais peindre le texte d'un état.
 */
export function describeStock(sku: ActiveSku, quantityInCart: number): StockDescription {
	const inCartSuffix =
		quantityInCart > 0 ? SKU_SELECTOR_TEXTS.STOCK.inCartSuffix(quantityInCart) : "";

	if (sku.inventory <= 0) {
		return { tone: "sold-out", label: SKU_SELECTOR_TEXTS.STOCK.SOLD_OUT, isBlocked: true };
	}

	const availableToAdd = Math.max(0, sku.inventory - quantityInCart);

	if (availableToAdd === 0) {
		return { tone: "maxed", label: SKU_SELECTOR_TEXTS.STOCK.ALL_IN_CART, isBlocked: true };
	}

	if (sku.inventory <= STOCK_THRESHOLDS.LOW) {
		// Le SEUIL se juge sur l'inventaire (rareté de la pièce), mais le NOMBRE
		// affiché est l'ajoutable — même base que la branche `available`. Sinon,
		// avec 3 en stock et 2 au panier, « il n'en reste que 3 · 2 au panier »
		// laissait croire à 3 ajoutables quand une seule l'était.
		return {
			tone: "low",
			label: SKU_SELECTOR_TEXTS.STOCK.low(availableToAdd) + inCartSuffix,
			isBlocked: false,
		};
	}

	return {
		tone: "available",
		label: SKU_SELECTOR_TEXTS.STOCK.available(availableToAdd) + inCartSuffix,
		isBlocked: false,
	};
}

/** Quantité déjà présente au panier pour un SKU donné. */
export function getQuantityInCart(
	skuId: string,
	cartItems: { skuId: string; quantity: number }[],
): number {
	return cartItems.find((item) => item.skuId === skuId)?.quantity ?? 0;
}

/**
 * Pièce mise en avant à l'ouverture. En cascade, du plus utile au moins mauvais :
 * couleur pré-choisie depuis la carte (si elle reste ajoutable) → première pièce
 * ajoutable → première en stock → pièce par défaut → première tout court.
 */
export function pickInitialSku(
	activeSkus: ActiveSku[],
	cartItems: { skuId: string; quantity: number }[],
	preselectedColor?: string | null,
): ActiveSku | undefined {
	const isAddable = (sku: ActiveSku) =>
		sku.inventory > 0 && sku.inventory - getQuantityInCart(sku.id, cartItems) > 0;

	if (preselectedColor) {
		const matching = activeSkus.find(
			(sku) => isAddable(sku) && sku.colors.some((link) => link.color.slug === preselectedColor),
		);
		if (matching) return matching;
	}

	return (
		activeSkus.find(isAddable) ??
		activeSkus.find((sku) => sku.inventory > 0) ??
		activeSkus.find((sku) => sku.isDefault) ??
		activeSkus[0]
	);
}

/**
 * Vignette d'une pièce : son propre média, sinon celui du produit.
 *
 * ⚠️ `PRODUCT_CAROUSEL_SELECT` porte `where: { mediaType: "IMAGE" }` + `take: 1` —
 * `images[0]` est donc déjà le média primaire filtré, il n'y a rien à re-trier ici.
 */
export function getSkuImage(sku: ActiveSku, product: ProductCarouselItem): ImageSelection {
	const image = sku.images[0];
	if (image) {
		return { url: image.url, blurDataUrl: image.blurDataUrl ?? null };
	}

	const primary = getPrimaryImageForList(product);
	return { url: primary.url, blurDataUrl: primary.blurDataUrl ?? null };
}
