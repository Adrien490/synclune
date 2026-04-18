import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { BadgeCountsStore } from "@/shared/types/store.types";

/**
 * Store Zustand pour les counts des badges navbar (wishlist + cart)
 *
 * Permet l'optimistic UI instantané sans attendre le server action.
 * Hydraté côté serveur via BadgeCountsStoreProvider.
 * Reset au logout via useLogout pour éviter le leak de state entre users.
 */
export const useBadgeCountsStore = create<BadgeCountsStore>()(
	devtools(
		(set) => ({
			wishlistCount: 0,
			cartCount: 0,
			setWishlistCount: (count) => set({ wishlistCount: count }, false, "setWishlistCount"),
			setCartCount: (count) => set({ cartCount: count }, false, "setCartCount"),
			incrementWishlist: () =>
				set((state) => ({ wishlistCount: state.wishlistCount + 1 }), false, "incrementWishlist"),
			decrementWishlist: () =>
				set(
					(state) => ({ wishlistCount: Math.max(0, state.wishlistCount - 1) }),
					false,
					"decrementWishlist",
				),
			adjustCart: (delta) =>
				set(
					(state) => ({ cartCount: Math.max(0, state.cartCount + delta) }),
					false,
					`adjustCart/${delta}`,
				),
			reset: () => set({ wishlistCount: 0, cartCount: 0 }, false, "reset"),
		}),
		{ name: "BadgeCountsStore", enabled: process.env.NODE_ENV === "development" },
	),
);
