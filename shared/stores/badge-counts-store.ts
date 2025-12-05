import { create } from "zustand";

interface BadgeCountsState {
	wishlistCount: number;
	cartCount: number;
	setWishlistCount: (count: number) => void;
	setCartCount: (count: number) => void;
	incrementWishlist: () => void;
	decrementWishlist: () => void;
	adjustCart: (delta: number) => void;
}

/**
 * Store Zustand pour les counts des badges navbar (wishlist + cart)
 *
 * Permet l'optimistic UI instantané sans attendre le server action.
 * Hydraté côté serveur via BadgeCountsStoreProvider.
 */
export const useBadgeCountsStore = create<BadgeCountsState>((set) => ({
	wishlistCount: 0,
	cartCount: 0,
	setWishlistCount: (count) => set({ wishlistCount: count }),
	setCartCount: (count) => set({ cartCount: count }),
	incrementWishlist: () =>
		set((state) => ({ wishlistCount: state.wishlistCount + 1 })),
	decrementWishlist: () =>
		set((state) => ({ wishlistCount: Math.max(0, state.wishlistCount - 1) })),
	adjustCart: (delta) =>
		set((state) => ({ cartCount: Math.max(0, state.cartCount + delta) })),
}));
