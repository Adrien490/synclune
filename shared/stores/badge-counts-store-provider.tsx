"use client";

import { useEffect, useRef } from "react";

import { useBadgeCountsStore } from "./badge-counts-store";

interface BadgeCountsStoreProviderProps {
	initialWishlistCount: number;
	initialCartCount: number;
	children: React.ReactNode;
}

/**
 * Provider pour hydrater le store des badges avec les valeurs serveur.
 *
 * Placé dans la Navbar pour initialiser les counts au premier rendu.
 * Les hooks (useWishlistToggle, useAddToCart, etc.) mettent ensuite
 * à jour le store de façon optimistic.
 *
 * Le store est resynchronisé si les valeurs initiales changent
 * (ex: après navigation ou refresh serveur).
 */
export function BadgeCountsStoreProvider({
	initialWishlistCount,
	initialCartCount,
	children,
}: BadgeCountsStoreProviderProps) {
	const setWishlistCount = useBadgeCountsStore(
		(state) => state.setWishlistCount
	);
	const setCartCount = useBadgeCountsStore((state) => state.setCartCount);

	// Refs pour tracker les valeurs précédentes et détecter les changements serveur
	const prevWishlistRef = useRef<number | null>(null);
	const prevCartRef = useRef<number | null>(null);

	useEffect(() => {
		// Initialisation ou resync si les valeurs serveur ont changé
		const wishlistChanged = prevWishlistRef.current !== initialWishlistCount;
		const cartChanged = prevCartRef.current !== initialCartCount;

		if (wishlistChanged) {
			setWishlistCount(initialWishlistCount);
			prevWishlistRef.current = initialWishlistCount;
		}

		if (cartChanged) {
			setCartCount(initialCartCount);
			prevCartRef.current = initialCartCount;
		}
	}, [initialWishlistCount, initialCartCount, setWishlistCount, setCartCount]);

	return <>{children}</>;
}
