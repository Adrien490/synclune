import { create } from "zustand";

import type { BadgeCountsStore } from "@/shared/types/store.types";

export type {
	BadgeCountsState,
	BadgeCountsActions,
	BadgeCountsStore,
} from "@/shared/types/store.types";

/**
 * Store Zustand pour les counts des badges navbar (wishlist + cart)
 *
 * Permet l'optimistic UI instantané sans attendre le server action.
 * Hydraté côté serveur via BadgeCountsStoreProvider.
 */
export const useBadgeCountsStore = create<BadgeCountsStore>((set) => ({
	wishlistCount: 0,
	cartCount: 0,
	setWishlistCount: (count) => set({ wishlistCount: count }),
	setCartCount: (count) => set({ cartCount: count }),
	incrementWishlist: () => set((state) => ({ wishlistCount: state.wishlistCount + 1 })),
	decrementWishlist: () =>
		set((state) => ({ wishlistCount: Math.max(0, state.wishlistCount - 1) })),
	adjustCart: (delta) => set((state) => ({ cartCount: Math.max(0, state.cartCount + delta) })),
	reset: () => set({ wishlistCount: 0, cartCount: 0 }),
}));
