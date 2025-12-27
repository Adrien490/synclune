"use client";

import { useEffect } from "react";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

interface NavbarCountsLoaderProps {
	cartCount: number;
	wishlistCount: number;
}

/**
 * Composant client qui met à jour les compteurs du store Zustand
 * une fois que les données sont streamées depuis le serveur.
 *
 * Ce composant est rendu dans un Suspense boundary après le shell statique,
 * permettant un FCP rapide avec des compteurs à 0, puis mise à jour
 * avec les vraies valeurs une fois chargées.
 */
export function NavbarCountsLoader({ cartCount, wishlistCount }: NavbarCountsLoaderProps) {
	const setCartCount = useBadgeCountsStore((state) => state.setCartCount);
	const setWishlistCount = useBadgeCountsStore((state) => state.setWishlistCount);

	useEffect(() => {
		// Met à jour les compteurs avec les vraies valeurs du serveur
		setCartCount(cartCount);
		setWishlistCount(wishlistCount);
	}, [cartCount, wishlistCount, setCartCount, setWishlistCount]);

	// Ce composant ne rend rien visuellement
	return null;
}
