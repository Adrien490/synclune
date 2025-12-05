"use client";

import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { Badge } from "@/shared/components/ui/badge";

/**
 * Badge panier - Client Component avec optimistic UI
 *
 * Lit le count depuis le store Zustand pour affichage instantané.
 * Le store est hydraté par BadgeCountsStoreProvider avec la valeur serveur,
 * puis mis à jour de façon optimistic par useAddToCart, useRemoveFromCart, etc.
 */
export function CartBadge() {
	const count = useBadgeCountsStore((state) => state.cartCount);

	// Validation défensive
	if (!count || count <= 0) {
		return null;
	}

	// Clamp à 99+ pour éviter débordement visuel
	const displayCount = count > 99 ? "99+" : count;

	return (
		<>
			{/* Annonce aria-live pour les lecteurs d'écran */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{count === 1
					? "1 article dans ton panier"
					: `${count} articles dans ton panier`}
			</div>

			<div className="absolute -top-1 -right-1">
				<Badge
					className="h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-secondary text-secondary-foreground border-2 border-secondary shadow-lg animate-in zoom-in-50 duration-300"
					aria-hidden="true"
				>
					{displayCount}
				</Badge>
			</div>
		</>
	);
}
