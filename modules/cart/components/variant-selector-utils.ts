import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import { getPrimaryImageForList } from "@/modules/products/services/product-display.service";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { VARIANT_SELECTOR_TEXTS } from "@/modules/cart/constants/variant-selector-texts";
import { slugify } from "@/shared/utils/generate-slug";

// ============================================================================
// Types
// ============================================================================

export type ActiveVariant = NonNullable<ProductCarouselItem["variants"]>[number];

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
export const QUANTITY_BOUNDS_ID = "variant-selector-quantity-bounds";

/**
 * ⚠️ SSOT de l'identifiant du dialog. Il vit dans ce module FEUILLE (pas dans
 * `variant-selector-dialog.tsx`) parce que `add-to-cart-card-button.tsx`, rendu sur
 * chaque carte de la grille, en a besoin : l'importer du dialog tirait tout son
 * graphe (motion, ResponsiveDialog) dans le bundle du catalogue.
 */
export const VARIANT_SELECTOR_DIALOG_ID = "variant-selector";

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
export function getDistinguishingDimensions(
	activeVariants: ActiveVariant[],
): DistinguishingDimensions {
	const colorKeys = new Set<string>();
	const materialKeys = new Set<string>();

	for (const variant of activeVariants) {
		colorKeys.add(variant.color?.name ?? "");
		materialKeys.add(variant.material?.name ?? "");
	}

	return { color: colorKeys.size > 1, material: materialKeys.size > 1 };
}

/**
 * Libellé d'une pièce : « Cristal · taille 52 », « Lavande · Perles naturelles ».
 *
 * ⚠️ **La taille est écrite dès que le VARIANT en a une**, qu'elle varie ou non, et
 * qu'une constante la déclare requise ou non. C'est ce qui met le P0 hors d'état de
 * nuire : `PRODUCT_TYPES_REQUIRING_SIZE` a pointé pendant des mois vers des slugs
 * inexistants, le groupe Taille n'était jamais rendu, et le VARIANT envoyé au panier
 * était le premier du tableau. Ici, aucune constante ne s'interpose.
 */
export function buildPieceLabel(
	variant: ActiveVariant,
	dimensions: DistinguishingDimensions,
	fallbackIndex: number,
): { text: string; size: string | null } {
	const parts: string[] = [];

	const colorName = variant.color?.name ?? null;
	const materialName = variant.material?.name ?? null;

	if (dimensions.color && colorName) parts.push(colorName);
	if (dimensions.material && materialName) parts.push(materialName);

	// Aucune dimension distinctive : on nomme quand même la pièce plutôt que de
	// laisser une ligne muette.
	if (parts.length === 0) {
		if (colorName) parts.push(colorName);
		else if (materialName) parts.push(materialName);
		else if (!variant.size) parts.push(`Pièce ${fallbackIndex + 1}`);
	}

	return {
		text: parts.join(" · "),
		size: variant.size ? `taille ${variant.size}` : null,
	};
}

/**
 * État de stock d'une pièce, compte tenu de ce qui est DÉJÀ dans le panier.
 *
 * ⚠️ Le libellé porte l'information ; la couleur du point n'est que redondance.
 * `--warning` en `text-warning` donne 2,19:1 sur `--background` — la doctrine du
 * dépôt (`cart-state-chip.tsx`) est de ne jamais peindre le texte d'un état.
 */
export function describeStock(variant: ActiveVariant, quantityInCart: number): StockDescription {
	const inCartSuffix =
		quantityInCart > 0 ? VARIANT_SELECTOR_TEXTS.STOCK.inCartSuffix(quantityInCart) : "";

	if (variant.stock <= 0) {
		return { tone: "sold-out", label: VARIANT_SELECTOR_TEXTS.STOCK.SOLD_OUT, isBlocked: true };
	}

	const availableToAdd = Math.max(0, variant.stock - quantityInCart);

	if (availableToAdd === 0) {
		return { tone: "maxed", label: VARIANT_SELECTOR_TEXTS.STOCK.ALL_IN_CART, isBlocked: true };
	}

	if (variant.stock <= STOCK_THRESHOLDS.LOW) {
		// Le SEUIL se juge sur l'inventaire (rareté de la pièce), mais le NOMBRE
		// affiché est l'ajoutable — même base que la branche `available`. Sinon,
		// avec 3 en stock et 2 au panier, « il n'en reste que 3 · 2 au panier »
		// laissait croire à 3 ajoutables quand une seule l'était.
		return {
			tone: "low",
			label: VARIANT_SELECTOR_TEXTS.STOCK.low(availableToAdd) + inCartSuffix,
			isBlocked: false,
		};
	}

	return {
		tone: "available",
		label: VARIANT_SELECTOR_TEXTS.STOCK.available(availableToAdd) + inCartSuffix,
		isBlocked: false,
	};
}

/** Quantité déjà présente au panier pour un VARIANT donné. */
export function getQuantityInCart(
	variantId: string,
	cartItems: { variantId: string; quantity: number }[],
): number {
	return cartItems.find((item) => item.variantId === variantId)?.quantity ?? 0;
}

/**
 * Pièce mise en avant à l'ouverture. En cascade, du plus utile au moins mauvais :
 * couleur pré-choisie depuis la carte (si elle reste ajoutable) → première pièce
 * ajoutable → première en stock → représentant (V5 : les listes arrivent
 * pré-triées `(position asc, id asc)`, donc `activeVariants[0]` EST le représentant).
 */
export function pickInitialVariant(
	activeVariants: ActiveVariant[],
	cartItems: { variantId: string; quantity: number }[],
	preselectedColor?: string | null,
): ActiveVariant | undefined {
	const isAddable = (variant: ActiveVariant) =>
		variant.stock > 0 && variant.stock - getQuantityInCart(variant.id, cartItems) > 0;

	if (preselectedColor) {
		const matching = activeVariants.find(
			(variant) =>
				isAddable(variant) &&
				variant.color != null &&
				slugify(variant.color.name) === preselectedColor,
		);
		if (matching) return matching;
	}

	return (
		activeVariants.find(isAddable) ??
		activeVariants.find((variant) => variant.stock > 0) ??
		activeVariants[0]
	);
}

/**
 * Vignette d'une pièce — schéma lean : le média vit sur le PRODUIT, toutes les
 * pièces partagent donc la même vignette (l'image primaire du produit).
 */
export function getVariantImage(
	_variant: ActiveVariant,
	product: ProductCarouselItem,
): ImageSelection {
	const primary = getPrimaryImageForList(product);
	return { url: primary.url, blurDataUrl: primary.blurDataUrl ?? null };
}
