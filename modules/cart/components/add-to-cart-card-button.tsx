"use client";

import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { cn } from "@/shared/utils/cn";
import { ShoppingBag } from "lucide-react";

interface AddToCartCardButtonProps {
	skuId: string;
	productTitle?: string;
	className?: string;
}

/**
 * Bouton d'ajout au panier pour les cartes produit
 *
 * Comportement responsive:
 * - Mobile: Bouton icône rond 44px transparent avec drop-shadow (style wishlist)
 * - Desktop: Bouton pleine largeur "Ajouter au panier" avec fond primary
 *
 * - Disabled pendant le pending pour éviter double-click
 * - Toujours visible sur mobile, apparaît au hover sur desktop
 * - Ajoute directement le SKU primaire au panier
 */
export function AddToCartCardButton({
	skuId,
	productTitle,
	className,
}: AddToCartCardButtonProps) {
	const { action, isPending } = useAddToCart();

	return (
		<form
			action={action}
			className={cn(
				// Position absolue dans les deux cas
				"absolute z-30",
				// Mobile: coin bas droite
				"bottom-2.5 right-2.5",
				// Desktop: pleine largeur en bas
				"sm:bottom-0 sm:right-0 sm:inset-x-0",
				// Visibilité
				"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100",
				"transition-opacity duration-300",
				className
			)}
		>
			<input type="hidden" name="skuId" value={skuId} />
			<input type="hidden" name="quantity" value="1" />
			<button
				type="submit"
				disabled={isPending}
				aria-disabled={isPending}
				onClick={(e) => e.stopPropagation()}
				className={cn(
					// Mobile: bouton rond 44px
					"size-11 rounded-full flex items-center justify-center",
					// Desktop: pleine largeur
					"sm:w-full sm:h-auto sm:rounded-none sm:py-2.5 sm:px-4",
					// Mobile: transparent, icône primary
					"bg-transparent text-primary",
					// Desktop: fond primary plein
					"sm:bg-primary sm:text-primary-foreground sm:shadow-lg sm:shadow-black/20",
					// Hover mobile: scale uniquement
					"hover:scale-110 active:scale-95",
					// Hover desktop: tracking + légère variation
					"sm:hover:scale-100 sm:active:scale-100 sm:hover:bg-primary/90 sm:hover:tracking-widest",
					// Transitions
					"motion-safe:transition-all motion-safe:duration-300",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
					"disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:tracking-normal disabled:hover:scale-100"
				)}
				aria-label={`Ajouter ${productTitle ?? "ce produit"} au panier`}
			>
				{/* Mobile: icône shopping bag avec drop-shadow pour contraste */}
				<ShoppingBag
					size={20}
					className="sm:hidden drop-shadow-[0_0_4px_rgba(255,255,255,1)] drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
					aria-hidden="true"
				/>
				{/* Desktop: texte */}
				<span className="hidden sm:inline text-sm font-medium">
					Ajouter au panier
				</span>
			</button>
		</form>
	);
}
