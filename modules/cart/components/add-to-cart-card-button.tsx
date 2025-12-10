"use client";

import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import type { Product } from "@/modules/products/types/product.types";
import { SKU_SELECTOR_DIALOG_ID } from "./sku-selector-dialog";
import { cn } from "@/shared/utils/cn";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface AddToCartCardButtonProps {
	skuId: string;
	productTitle?: string;
	/** Produit complet pour déterminer si une sélection de variante est nécessaire */
	product?: Product;
	/** Couleur pré-sélectionnée depuis les swatches de la ProductCard */
	preselectedColor?: string | null;
	className?: string;
}

/**
 * Bouton d'ajout au panier pour les cartes produit
 *
 * Comportement responsive:
 * - Mobile: Icône ShoppingBag rose avec drop-shadow renforcé (sans fond)
 * - Desktop: Bouton pleine largeur "Ajouter au panier" avec fond primary
 *
 * - Disabled pendant le pending pour éviter double-click
 * - Toujours visible sur mobile, apparaît au hover sur desktop
 * - Ouvre le dialog de sélection SKU uniquement si le produit a plusieurs variantes
 * - Ajoute directement au panier si le produit n'a qu'un seul SKU
 */
export function AddToCartCardButton({
	skuId,
	productTitle,
	product,
	preselectedColor,
	className,
}: AddToCartCardButtonProps) {
	const { action, isPending } = useAddToCart();
	const { open: openSkuSelector } = useDialog(SKU_SELECTOR_DIALOG_ID);

	// Détermine si le produit a plusieurs variantes actives (SKUs)
	// Note: On filtre par isActive car le dialog ne montre que les SKUs actifs
	const activeSkusCount = product?.skus?.filter((s) => s.isActive).length ?? 0;
	const hasMultipleVariants = activeSkusCount > 1;

	// Handler de clic : ouvre le dialog si plusieurs variantes, sinon soumet le formulaire
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();

		if (hasMultipleVariants && product) {
			// Plusieurs variantes : ouvrir le dialog de sélection
			e.preventDefault();
			openSkuSelector({ product, preselectedColor });
		}
		// Un seul SKU : laisser le formulaire se soumettre normalement
	};

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
			<Button
				type="submit"
				disabled={isPending}
				aria-disabled={isPending}
				onClick={handleClick}
				size="icon"
				className={cn(
					// Mobile: bouton transparent, contraste géré par drop-shadow sur l'icône
					"size-11 rounded-full bg-transparent hover:bg-transparent",
					// Desktop: pleine largeur avec fond primary
					"sm:bg-primary sm:text-primary-foreground",
					"sm:w-full sm:h-auto sm:rounded-none sm:py-2.5 sm:px-4",
					"sm:shadow-lg sm:shadow-black/20",
					// Active mobile: feedback tactile
					"active:scale-95",
					// Hover desktop uniquement
					"sm:hover:bg-primary/90 sm:hover:tracking-widest",
					// Transitions
					"motion-safe:transition-all motion-safe:duration-200",
					"disabled:hover:tracking-normal disabled:hover:scale-100"
				)}
				aria-label={`Ajouter ${productTitle ?? "ce produit"} au panier`}
			>
				{/* Mobile: icône shopping bag avec drop-shadow renforcé pour contraste */}
				<ShoppingBag
					size={20}
					strokeWidth={2}
					className={cn(
						"sm:hidden text-primary",
						"drop-shadow-[0_0_4px_rgba(255,255,255,1)] drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
					)}
					aria-hidden="true"
				/>
				{/* Desktop: texte */}
				<span className="hidden sm:inline text-sm font-medium">
					Ajouter au panier
				</span>
			</Button>
		</form>
	);
}
