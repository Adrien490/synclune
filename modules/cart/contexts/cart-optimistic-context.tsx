"use client";

import { createContext, useContext, useTransition } from "react";

export type CartOptimisticAction =
	| { type: "remove"; itemId: string }
	| { type: "updateQuantity"; itemId: string; quantity: number };

export interface CartOptimisticContextValue {
	updateOptimisticCart: (action: CartOptimisticAction) => void;
	isPending: boolean;
	startTransition: React.TransitionStartFunction;
}

export const CartOptimisticContext = createContext<CartOptimisticContextValue | null>(null);

export function useCartOptimistic() {
	const context = useContext(CartOptimisticContext);
	if (!context) {
		throw new Error("useCartOptimistic must be used within CartOptimisticProvider");
	}
	return context;
}

/**
 * Hook optionnel qui ne throw pas si utilisé en dehors du contexte
 * Utile pour les composants qui peuvent être utilisés en dehors du CartSheet
 */
export function useCartOptimisticSafe() {
	return useContext(CartOptimisticContext);
}
