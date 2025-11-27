'use client'

import { HeartIcon } from "@/shared/components/icons/heart-icon"
import { Button } from "@/shared/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { useToggleWishlistItem } from '@/modules/wishlist/hooks/use-toggle-wishlist-item'

interface WishlistButtonCompactProps {
	skuId: string
	isInWishlist: boolean
	className?: string
}

/**
 * Bouton Wishlist Compact (Icon-Only) - Client Component
 *
 * Version compacte du bouton wishlist pour placement discret
 * en haut à droite du titre produit.
 *
 * UX Pattern e-commerce moderne (Amazon, Etsy, etc.)
 * - Icon-only pour être discret
 * - Tooltip pour clarté
 * - Position: top-right du titre
 * - Animation subtile au hover
 * - Source de vérité unique (DB) pour éviter désynchronisations
 */
export function WishlistButtonCompact({
	skuId,
	isInWishlist,
	className,
}: WishlistButtonCompactProps) {
	const { action, isPending } = useToggleWishlistItem()

	// Utilise directement isInWishlist (source de vérité: DB)
	// Pas d'optimistic update pour éviter les désynchronisations

	return (
		<TooltipProvider>
			<Tooltip delayDuration={300}>
				<TooltipTrigger asChild>
					<form action={action} className={className}>
						<input type="hidden" name="skuId" value={skuId} />
						<Button
							type="submit"
							variant="ghost"
							size="icon"
							disabled={isPending}
							className="relative group h-10 w-10 rounded-full hover:bg-accent hover:scale-110 transition-all duration-300"
							aria-label={
								isInWishlist
									? 'Retirer de la wishlist'
									: 'Ajouter à la wishlist'
							}
							aria-pressed={isInWishlist}
						>
							<HeartIcon
								variant={isInWishlist ? 'filled' : 'outline'}
								size={22}
								decorative
								className={`transition-all duration-300 ${
									isInWishlist
										? 'text-primary scale-110'
										: 'text-muted-foreground group-hover:text-primary'
								}`}
							/>
						</Button>
					</form>
				</TooltipTrigger>
				<TooltipContent side="bottom" sideOffset={5}>
					<p className="text-xs">
						{isInWishlist
							? 'Retirer de la wishlist'
							: 'Ajouter à la wishlist'}
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
