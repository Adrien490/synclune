import { type Prisma } from "@/app/generated/prisma/client";
import { type ActionStatus } from "@/shared/types/server-action";
import { type GET_CART_SELECT } from "../constants/cart";

// ============================================================================
// TYPES - CART
// ============================================================================

export type GetCartReturn = Prisma.CartGetPayload<{
	select: typeof GET_CART_SELECT;
}> | null;

export type CartItem = NonNullable<GetCartReturn>["items"][0];

// ============================================================================
// TYPES - CART SUMMARY
// ============================================================================

type CartSummary = {
	itemCount: number;
	totalAmount: number;
	hasItems: boolean;
};

export type GetCartSummaryReturn = CartSummary;

// ============================================================================
// TYPES - CART VALIDATION
// ============================================================================

export interface CartValidationIssue {
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

/**
 * Item tronque lors de la fusion (MAX_CART_ITEMS depasse).
 * Expose au UI pour informer l'utilisateur qu'il a perdu des items post-login.
 */
// Plus de types de fusion de panier : `merge-carts.ts` a été supprimée avec le
// hook post-login de Better Auth (retrait de l'espace client 2026-07-31). Un
// panier invité RESTE invité — il n'y a plus de compte dans lequel le fusionner.

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
