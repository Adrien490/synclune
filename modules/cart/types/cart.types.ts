import { type Prisma } from "@/app/generated/prisma/client";
import { type CART_SKU_SELECT } from "../constants/cart";

// ============================================================================
// TYPES - CART
// ============================================================================

/** SKU matérialisé depuis la base pour une ligne de panier. */
export type CartItemSku = Prisma.ProductSkuGetPayload<{
	select: typeof CART_SKU_SELECT;
}>;

/**
 * Une ligne de panier telle que la voit l'UI : la quantité et le prix témoin
 * viennent du cookie, le reste de la base.
 *
 * ⚠️ `id` vaut le **skuId**, pas un identifiant de ligne. Depuis le passage du
 * panier en cookie (2026-08-04) il n'existe plus de table `CartItem`, donc plus
 * d'identifiant propre à la ligne : le SKU EST l'identité de la ligne (le cookie
 * dédoublonne par `skuId`, comme le faisait la contrainte `@@unique([cartId, skuId])`).
 * Le champ est conservé sous le nom `id` parce qu'il sert de clé de rendu et
 * d'identifiant de mutation dans toute l'UI panier.
 */
export interface CartItem {
	id: string;
	quantity: number;
	/** Prix TTC unitaire constaté à l'ajout, en centimes (témoin d'affichage). */
	priceAtAdd: number;
	sku: CartItemSku;
}

/**
 * Le panier tel que le rend l'UI.
 *
 * `null` n'est plus un état possible : un visiteur sans cookie a simplement un
 * panier vide. Les appelants qui testaient `!cart` peuvent tester
 * `cart.items.length === 0`.
 */
interface CartView {
	items: CartItem[];
	/** Code promo appliqué et TOUJOURS éligible, `null` sinon (re-dérivé à la lecture). */
	appliedDiscountCode: string | null;
	/** Montant de la remise en centimes, re-dérivé des articles courants. */
	discountAmountCache: number | null;
}

export type GetCartReturn = CartView;

// ============================================================================
// TYPES - CART VALIDATION
// ============================================================================

export interface CartValidationIssue {
	/** Identifiant de la ligne fautive — le skuId (cf. `CartItem.id`). */
	cartItemId: string;
	skuId: string;
	productTitle: string;
	issueType:
		"OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "INACTIVE" | "NOT_PUBLIC" | "DELETED" | "UNKNOWN";
	message: string;
}

export interface ValidateCartResult {
	isValid: boolean;
	issues: CartValidationIssue[];
	/** Indique si la validation a échoué à cause d'un rate limit */
	rateLimited?: boolean;
}

// ============================================================================
// TYPES - CART MERGE
// ============================================================================

// Plus de types de fusion de panier : `merge-carts.ts` a été supprimée avec le
// hook post-login de Better Auth (retrait de l'espace client 2026-07-31). Un
// panier invité RESTE invité — il n'y a plus de compte dans lequel le fusionner.
// Depuis le passage en cookie (2026-08-04), le panier est de toute façon lié au
// navigateur, plus à une identité.

// ============================================================================
// TYPES - CART PRICING (from services/)
// ============================================================================

export interface CartItemForPriceCheck {
	id: string;
	priceAtAdd: number;
	quantity: number;
	sku: {
		priceInclTax: number;
		product: {
			title: string;
		};
	};
}

export interface PriceChangeResult<T extends CartItemForPriceCheck> {
	/** Tous les articles dont le prix a changé */
	itemsWithPriceChange: T[];
	/** Articles dont le prix a augmenté */
	itemsWithPriceIncrease: T[];
	/** Articles dont le prix a baissé */
	itemsWithPriceDecrease: T[];
	/** Économies totales si on actualise les prix */
	totalSavings: number;
	/** Surcoût total si prix ont augmenté */
	totalIncrease: number;
}

// ============================================================================
// TYPES - CART ITEM AVAILABILITY (from services/)
// ============================================================================

export interface CartItemForValidation {
	id: string;
	skuId: string;
	quantity: number;
	sku: {
		id: string;
		isActive: boolean;
		inventory: number;
		deletedAt: Date | null;
		product: {
			id: string;
			title: string;
			status: string;
			deletedAt: Date | null;
		};
	};
}

export interface AvailabilityCheckResult {
	isAvailable: boolean;
	issue?: CartValidationIssue;
}
