"use client";

import { createContext, useContext } from "react";

export interface WishlistListOptimisticContextValue {
	/**
	 * Appelé quand un item est retiré de la wishlist depuis la liste
	 * Permet au parent de mettre à jour l'affichage optimiste
	 */
	onItemRemoved: (skuId: string) => void;
}

export const WishlistListOptimisticContext = createContext<WishlistListOptimisticContextValue | null>(null);

/**
 * Hook pour accéder au contexte optimiste de la liste wishlist
 * Retourne null si utilisé en dehors du contexte (comportement safe)
 */
export function useWishlistListOptimistic() {
	return useContext(WishlistListOptimisticContext);
}
