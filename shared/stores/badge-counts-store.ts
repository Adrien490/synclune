import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { BadgeCountsStore } from "@/shared/types/store.types";

/**
 * Store Zustand pour les counts des badges navbar (wishlist + cart)
 *
 * Permet l'optimistic UI instantané sans attendre le server action.
 * Hydraté côté serveur via BadgeCountsStoreProvider.
 * Reset au logout via useLogout pour éviter le leak de state entre users.
 *
 * Les champs `*Bump` sont publiés à chaque mutation optimistic (adjustCart,
 * incrementWishlist, decrementWishlist) et consommés par `<CountBadge>` pour
 * déclencher un flash "+N" éphémère. Les hydratations serveur (`set*Count`)
 * ne touchent volontairement PAS au bump pour éviter qu'un page-load réhydraté
 * ne déclenche un flash visuel non sollicité.
 */
export const useBadgeCountsStore = create<BadgeCountsStore>()(
	devtools(
		(set) => ({
			wishlistCount: 0,
			cartCount: 0,
			wishlistBump: null,
			cartBump: null,
			setWishlistCount: (count) => set({ wishlistCount: count }, false, "setWishlistCount"),
			setCartCount: (count) => set({ cartCount: count }, false, "setCartCount"),
			incrementWishlist: () =>
				set(
					(state) => ({
						wishlistCount: state.wishlistCount + 1,
						wishlistBump: { delta: 1, key: Date.now() },
					}),
					false,
					"incrementWishlist",
				),
			decrementWishlist: () =>
				set(
					(state) => ({
						wishlistCount: Math.max(0, state.wishlistCount - 1),
						wishlistBump: { delta: -1, key: Date.now() },
					}),
					false,
					"decrementWishlist",
				),
			adjustCart: (delta) =>
				set(
					(state) => ({
						cartCount: Math.max(0, state.cartCount + delta),
						cartBump: delta !== 0 ? { delta, key: Date.now() } : state.cartBump,
					}),
					false,
					`adjustCart/${delta}`,
				),
			reset: () =>
				set({ wishlistCount: 0, cartCount: 0, wishlistBump: null, cartBump: null }, false, "reset"),
		}),
		{ name: "BadgeCountsStore", enabled: process.env.NODE_ENV === "development" },
	),
);
