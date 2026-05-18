"use client";

import { createContext, use } from "react";

export type CartOptimisticAction =
	| { type: "remove"; itemId: string }
	| { type: "updateQuantity"; itemId: string; quantity: number };

export interface CartTombstoneEntry {
	onUndo: () => void;
	displayName: string;
}

export interface CartOptimisticContextValue {
	updateOptimisticCart: (action: CartOptimisticAction) => void;
	isPending: boolean;
	startTransition: React.TransitionStartFunction;
	/**
	 * Items marqués "tombstoned" : visible 5s en placeholder avec bouton Annuler
	 * avant retrait visuel final. Pattern Gmail mobile / iOS Mail — remplace les
	 * toasts undo en bas d'écran qui masquaient la bottom-bar. Cf `Tombstone`.
	 */
	tombstones: ReadonlyMap<string, CartTombstoneEntry>;
	markAsTombstone: (itemId: string, entry: CartTombstoneEntry) => void;
	cancelTombstone: (itemId: string) => void;
}

export const CartOptimisticContext = createContext<CartOptimisticContextValue | null>(null);

export function useCartOptimistic() {
	const context = use(CartOptimisticContext);
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
	return use(CartOptimisticContext);
}
