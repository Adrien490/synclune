"use client";

import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { cn } from "@/shared/utils/cn";
import { Plus } from "lucide-react";

interface AddToCartCardButtonProps {
	skuId: string;
	productTitle?: string;
	className?: string;
}

/**
 * Bouton d'ajout au panier pour les cartes produit
 *
 * Comportement responsive:
 * - Mobile: Bouton icône rond 44px (conforme WCAG 2.5.5) en bas à droite
 * - Desktop: Bouton pleine largeur "Ajouter au panier" avec effet hover
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
					// Styles communs
					"bg-primary text-primary-foreground",
					// Ombre pour contraste sur images claires
					"shadow-lg shadow-black/20",
					// Feedback tactile (scale) + transitions
					"hover:scale-105 active:scale-95 sm:hover:scale-100 sm:active:scale-100",
					"motion-safe:transition-all motion-safe:duration-300",
					"hover:bg-primary/90 sm:hover:tracking-widest",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
					"disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:tracking-normal disabled:hover:scale-100"
				)}
				aria-label={`Ajouter ${productTitle ?? "ce produit"} au panier`}
			>
				{/* Mobile: icône seule */}
				<Plus size={20} className="sm:hidden" aria-hidden="true" />
				{/* Desktop: texte */}
				<span className="hidden sm:inline text-sm font-medium">
					Ajouter au panier
				</span>
			</button>
		</form>
	);
}
