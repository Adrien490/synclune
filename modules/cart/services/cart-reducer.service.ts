import type { GetCartReturn } from "../types/cart.types";
import type { CartOptimisticAction } from "../contexts/cart-optimistic-context";

/**
 * Reducer for optimistic cart state updates
 * Handles item removal and quantity changes
 */
export function cartReducer(state: GetCartReturn, action: CartOptimisticAction): GetCartReturn {
	// Plus de garde `if (!state)` : depuis le passage du panier en cookie
	// (2026-08-04), `getCart()` ne rend plus jamais `null` — un visiteur sans
	// cookie a simplement un panier vide.
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
					item.id === action.itemId ? { ...item, quantity: action.quantity } : item,
				),
			};
		case "clear":
			// Miroir de la Server Action `clearCart`, qui supprime le cookie d'un bloc.
			return {
				...state,
				items: [],
			};
		default: {
			const _exhaustiveCheck: never = action;
			return _exhaustiveCheck;
		}
	}
}
