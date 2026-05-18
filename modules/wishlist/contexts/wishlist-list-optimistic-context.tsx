"use client";

import { createContext, use } from "react";

export interface WishlistTombstoneEntry {
	onUndo: () => void;
	displayName: string;
}

export interface WishlistListOptimisticContextValue {
	/**
	 * Appelé quand un item est retiré de la wishlist depuis la liste
	 * Permet au parent de mettre à jour l'affichage optimiste
	 */
	onItemRemoved: (productId: string) => void;
	/**
	 * Items en état "tombstone" : visible 5s avec bouton Annuler inline avant
	 * retrait visuel final. Pattern Gmail / iOS Mail — remplace les toasts
	 * undo bottom mobile qui masquaient la bottom-bar. Cf `Tombstone`.
	 */
	tombstones: ReadonlyMap<string, WishlistTombstoneEntry>;
	markAsTombstone: (productId: string, entry: WishlistTombstoneEntry) => void;
	cancelTombstone: (productId: string) => void;
}

export const WishlistListOptimisticContext =
	createContext<WishlistListOptimisticContextValue | null>(null);

/**
 * Hook pour accéder au contexte optimiste de la liste wishlist
 * Retourne null si utilisé en dehors du contexte (comportement safe)
 */
export function useWishlistListOptimistic() {
	return use(WishlistListOptimisticContext);
}
