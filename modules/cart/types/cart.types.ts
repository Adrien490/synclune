import { type Prisma } from "@/app/generated/prisma/client";
import { type CART_VARIANT_SELECT } from "../constants/cart";

// ============================================================================
// TYPES - CART
// ============================================================================

/** VARIANT matérialisé depuis la base pour une ligne de panier. */
export type CartItemVariant = Prisma.ProductVariantGetPayload<{
	select: typeof CART_VARIANT_SELECT;
}>;

/**
 * Une ligne de panier telle que la voit l'UI : la quantité et le prix témoin
 * viennent du cookie, le reste de la base.
 *
 * ⚠️ `id` vaut le **variantId**, pas un identifiant de ligne. Depuis le passage du
 * panier en cookie (2026-08-04) il n'existe plus de table `CartItem`, donc plus
 * d'identifiant propre à la ligne : le VARIANT EST l'identité de la ligne (le cookie
 * dédoublonne par `variantId`, comme le faisait la contrainte `@@unique([cartId, variantId])`).
 * Le champ est conservé sous le nom `id` parce qu'il sert de clé de rendu et
 * d'identifiant de mutation dans toute l'UI panier.
 */
export interface CartItem {
	id: string;
	quantity: number;
	/** Prix TTC unitaire constaté à l'ajout, en centimes (témoin d'affichage). */
	priceAtAdd: number;
	variant: CartItemVariant;
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
}

export type GetCartReturn = CartView;

// ============================================================================
// TYPES - CART VALIDATION
// ============================================================================

export interface CartValidationIssue {
	/** Identifiant de la ligne fautive — le variantId EST l'identité de la ligne. */
	variantId: string;
	productTitle: string;
	issueType: "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "INACTIVE" | "NOT_PUBLIC";
	message: string;
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
	priceAtAdd: number;
	quantity: number;
	variant: {
		/** Override — null = prix du produit. */
		priceCents: number | null;
		product: {
			name: string;
			priceCents: number;
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
	variantId: string;
	quantity: number;
	variant: {
		id: string;
		active: boolean;
		stock: number;
		product: {
			id: string;
			name: string;
			active: boolean;
		};
	};
}

export interface AvailabilityCheckResult {
	isAvailable: boolean;
	issue?: CartValidationIssue;
}
