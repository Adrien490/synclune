"use client";

import { useEffect } from "react";

import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import type { BadgeCountsStoreProviderProps } from "@/shared/types/store.types";

/**
 * Provider pour hydrater le store des badges avec les valeurs serveur.
 *
 * Placé dans la Navbar pour initialiser les counts au premier rendu.
 * Les hooks (useWishlistToggle, useAddToCart, etc.) mettent ensuite
 * à jour le store de façon optimistic.
 *
 * Le store est resynchronisé quand les valeurs initiales changent
 * (ex: après navigation ou refresh serveur). L'effect ne se relance
 * que si les deps primitives changent — pas besoin de refs pour tracker.
 */
export function BadgeCountsStoreProvider({
	initialWishlistCount,
	initialCartCount,
	children,
}: BadgeCountsStoreProviderProps) {
	const setWishlistCount = useBadgeCountsStore((state) => state.setWishlistCount);
	const setCartCount = useBadgeCountsStore((state) => state.setCartCount);

	useEffect(() => {
		setWishlistCount(initialWishlistCount);
		setCartCount(initialCartCount);
	}, [initialWishlistCount, initialCartCount, setWishlistCount, setCartCount]);

	return <>{children}</>;
}
