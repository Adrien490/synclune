"use client";

import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { cn } from "@/shared/utils/cn";

interface AddToCartCardButtonProps {
	skuId: string;
	productTitle?: string;
	className?: string;
	/** Si true, le produit a plusieurs variantes et nécessite le drawer */
	hasMultipleVariants?: boolean;
	/** Callback pour ouvrir le drawer de sélection */
	onOpenDrawer?: () => void;
}

/**
 * Bouton d'ajout au panier simplifié pour les cartes produit
 *
 * - Texte "Ajouter au panier" avec effet hover (tracking-widest)
 * - Disabled pendant le pending pour éviter double-click
 * - Visible au hover sur desktop, toujours visible sur mobile
 * - Si hasMultipleVariants: ouvre le drawer au lieu d'ajouter directement
 */
export function AddToCartCardButton({
	skuId,
	productTitle,
	className,
	hasMultipleVariants = false,
	onOpenDrawer,
}: AddToCartCardButtonProps) {
	const { action, isPending } = useAddToCart();

	// Si multi-variantes et callback fourni, ouvrir le drawer
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();

		if (hasMultipleVariants && onOpenDrawer) {
			onOpenDrawer();
		}
	};

	// Pour les produits mono-SKU, utiliser le form normal
	if (!hasMultipleVariants || !onOpenDrawer) {
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

	// Pour les produits multi-variantes, bouton qui ouvre le drawer
	return (
		<div
			className={cn(
				"absolute bottom-0 inset-x-0 z-20",
				"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100",
				"transition-all duration-300",
				className
			)}
		>
			<button
				type="button"
				onClick={handleClick}
				className={cn(
					"w-full py-2.5 px-4",
					"bg-primary text-primary-foreground",
					"text-sm font-medium",
					"motion-safe:transition-all motion-safe:duration-300",
					"hover:bg-primary/90 hover:tracking-widest",
					"active:scale-[0.98]",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
				)}
				aria-label={`Choisir les options pour ${productTitle ?? "ce produit"}`}
			>
				Choisir les options
			</button>
		</div>
	);
}
