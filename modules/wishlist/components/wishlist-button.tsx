"use client";

import { HeartIcon } from "@/shared/components/icons/heart-icon";
import { Button } from "@/shared/components/ui/button";
import { useToggleWishlistItem } from "@/modules/wishlist/hooks/use-toggle-wishlist-item";

interface WishlistButtonProps {
	skuId: string;
	isInWishlist: boolean;
	className?: string;
}

/**
 * Bouton Wishlist Full-Width - Client Component
 *
 * Architecture Next.js 16 :
 * - Server Action avec toggle-wishlist-item
 * - Source de vérité unique (DB) pour éviter désynchronisations
 * - Cache auto-invalidé par updateTags()
 * - Disabled pendant mutation (isPending)
 * - Accessible (ARIA labels)
 *
 * UX :
 * - Animation cœur (scale + pulse)
 * - États visuels clairs (filled/outline)
 * - Feedback immédiat via isPending (bouton désactivé)
 * - Gère déconnexion (redirect login)
 */
export function WishlistButton({
	skuId,
	isInWishlist,
	className,
}: WishlistButtonProps) {
	const { action, isPending } = useToggleWishlistItem();

	// Utilise directement isInWishlist (source de vérité: DB)
	// Pas d'optimistic update pour éviter les désynchronisations

	return (
		<form action={action}>
			<input type="hidden" name="skuId" value={skuId} />
			<Button
				type="submit"
				variant="outline"
				size="lg"
				disabled={isPending}
				className={`relative group ${className}`}
				aria-label={
					isInWishlist
						? "Retirer de la wishlist"
						: "Ajouter à la wishlist"
				}
				aria-pressed={isInWishlist}
			>
				<HeartIcon
					variant={isInWishlist ? "filled" : "outline"}
					size={24}
					decorative
					className={`transition-all duration-300 ${
						isInWishlist
							? "text-primary scale-110"
							: "text-muted-foreground group-hover:text-primary group-hover:scale-105"
					}`}
				/>
				<span className="ml-2 font-medium">
					{isInWishlist
						? "Dans ma wishlist"
						: "Ajouter à la wishlist"}
				</span>
			</Button>
		</form>
	);
}
