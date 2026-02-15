import type { GetCartReturn } from "../types/cart.types";
import type { CartOptimisticAction } from "../contexts/cart-optimistic-context";

/**
 * Reducer for optimistic cart state updates
 * Handles item removal and quantity changes
 */
export function cartReducer(
	state: GetCartReturn,
	action: CartOptimisticAction
): GetCartReturn {
	if (!state) return state;
	switch (action.type) {
		case "remove":
			return {
				...state,
				items: state.items.filter((item) => item.id !== action.itemId),
			};
		case "updateQuantity":
			return {
				...state,
				items: state.items.map((item) =>
					item.id === action.itemId
						? { ...item, quantity: action.quantity }
						: item
				),
			};
		default: {
			const _exhaustiveCheck: never = action;
			return _exhaustiveCheck;
		}
	}
}
