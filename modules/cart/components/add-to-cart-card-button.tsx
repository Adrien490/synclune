"use client";

import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { cn } from "@/shared/utils/cn";

interface AddToCartCardButtonProps {
	skuId: string;
	productTitle?: string;
	className?: string;
}

/**
 * Bouton d'ajout au panier simplifié pour les cartes produit
 *
 * - Texte "Ajouter au panier" avec effet hover (tracking-widest)
 * - Disabled pendant le pending pour éviter double-click
 * - Visible au hover sur desktop, toujours visible sur mobile
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
				"absolute bottom-0 inset-x-0 z-20",
				"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100",
				"transition-all duration-300",
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
					"w-full py-2.5 px-4",
					"bg-primary text-primary-foreground",
					"text-sm font-medium",
					"motion-safe:transition-all motion-safe:duration-300",
					"hover:bg-primary/90 hover:tracking-widest",
					"active:scale-[0.98]",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
					"disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:tracking-normal"
				)}
				aria-label={`Ajouter ${productTitle ?? "ce produit"} au panier`}
			>
				Ajouter au panier
			</button>
		</form>
	);
}
