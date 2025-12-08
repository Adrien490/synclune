import { Prisma } from "@/app/generated/prisma/client";
import { ActionStatus } from "@/shared/types/server-action";
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

// ============================================================================
// TYPES - CART VALIDATION
// ============================================================================

export interface CartValidationIssue {
	cartItemId: string;
	skuId: string;
	productTitle: string;
	issueType: "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "INACTIVE" | "NOT_PUBLIC" | "DELETED";
	message: string;
	availableStock?: number;
}

export interface ValidateCartResult {
	isValid: boolean;
	issues: CartValidationIssue[];
}

// ============================================================================
// TYPES - CART MERGE
// ============================================================================

export type MergeCartsResult =
	| {
			status: typeof ActionStatus.SUCCESS;
			message: string;
			data: {
				mergedItems: number;
				conflicts: number;
			};
	  }
	| {
			status: typeof ActionStatus.ERROR;
			message: string;
	  };
