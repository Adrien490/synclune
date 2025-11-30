import { Prisma } from "@/app/generated/prisma/client";
import { GET_CART_SELECT } from "../constants/cart.constants";

// ============================================================================
// TYPES - CART
// ============================================================================

export type GetCartReturn = Prisma.CartGetPayload<{
	select: typeof GET_CART_SELECT;
}> | null;

export type Cart = Prisma.CartGetPayload<{
	select: typeof GET_CART_SELECT;
}>;

export type CartItem = NonNullable<GetCartReturn>["items"][0];

// ============================================================================
// TYPES - CART SUMMARY
// ============================================================================

export type CartSummary = {
	itemCount: number;
	totalAmount: number;
	hasItems: boolean;
};

export type GetCartSummaryReturn = CartSummary;
