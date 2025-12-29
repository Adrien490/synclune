"use client";

import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import { usePulseOnChange } from "@/shared/hooks";

/**
 * Badge wishlist - Client Component avec optimistic UI
 *
 * Lit le count depuis le store Zustand pour affichage instantané.
 * Le store est hydraté par BadgeCountsStoreProvider avec la valeur serveur,
 * puis mis à jour de façon optimistic par useWishlistToggle.
 *
 * Animation pulse quand le count change pour feedback visuel.
 */
export function WishlistBadge() {
	const count = useBadgeCountsStore((state) => state.wishlistCount);
	const shouldPulse = usePulseOnChange(count);

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
					? "1 article dans ta wishlist"
					: `${count} articles dans ta wishlist`}
			</div>

			<div className="absolute -top-1 -right-1">
				<Badge
					className={cn(
						"h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-secondary text-secondary-foreground border-2 border-secondary shadow-lg animate-in zoom-in-50 duration-300",
						shouldPulse && "animate-badge-pulse"
					)}
					aria-hidden="true"
				>
					{displayCount}
				</Badge>
			</div>
		</>
	);
}
