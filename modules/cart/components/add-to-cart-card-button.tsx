"use client";

import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import type { Product } from "@/modules/products/types/product.types";
import { SKU_SELECTOR_DIALOG_ID } from "./sku-selector-dialog";
import { cn } from "@/shared/utils/cn";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface AddToCartCardButtonProps {
	skuId: string;
	productTitle?: string;
	/**
	 * Produit complet pour déterminer si une sélection de variante est nécessaire.
	 * Required pour ouvrir le dialog de sélection SKU si le produit a plusieurs variantes.
	 */
	product: Product;
	/** Couleur pré-sélectionnée depuis les swatches de la ProductCard */
	preselectedColor?: string | null;
	/** Variante d'affichage: "icon" (défaut) ou "mobile-full" (pleine largeur mobile) */
	variant?: "icon" | "mobile-full";
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
	variant = "icon",
	className,
}: AddToCartCardButtonProps) {
	const isMobileFull = variant === "mobile-full";
	const { action, isPending } = useAddToCart();
	const { open: openSkuSelector } = useDialog(SKU_SELECTOR_DIALOG_ID);

	// Détermine si le produit a plusieurs variantes actives (SKUs)
	// Note: On filtre par isActive car le dialog ne montre que les SKUs actifs
	const activeSkusCount = product.skus?.filter((s) => s.isActive).length ?? 0;
	const hasMultipleVariants = activeSkusCount > 1;

	// Handler de clic : ouvre le dialog si plusieurs variantes, sinon soumet le formulaire
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();

		if (hasMultipleVariants) {
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
				isMobileFull
					? // Mobile full-width: position relative dans le flux
						"relative w-full"
					: // Icon variant: position absolue overlay
						cn(
							"absolute z-30",
							"bottom-2.5 right-2.5",
							"sm:bottom-0 sm:right-0 sm:inset-x-0",
							"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100",
							"transition-opacity duration-300"
						),
				className
			)}
		>
			<input type="hidden" name="skuId" value={skuId} />
			<input type="hidden" name="quantity" value="1" />
			<Button
				type="submit"
				disabled={isPending}
				aria-busy={isPending}
				onClick={handleClick}
				size={isMobileFull ? "default" : "icon"}
				className={cn(
					isMobileFull
						? // Mobile full-width: bouton discret avec bordure complète
							cn(
								"w-full h-11 rounded-md",
								"bg-primary/5 text-foreground",
								"border border-primary/50",
								"hover:border-primary/70 hover:bg-primary/10",
								"active:scale-[0.98]",
								"font-medium text-sm",
								"motion-safe:transition-all motion-safe:duration-200"
							)
						: // Icon variant: styles responsive existants
							cn(
								// Mobile: fond transparent comme WishlistButton (cohérence)
								"size-11 rounded-full",
								"bg-transparent",
								"can-hover:hover:scale-110 hover:bg-transparent active:scale-95",
								// Desktop: pleine largeur avec fond primary opaque + min-h-11 (WCAG 2.5.5)
								"sm:w-full sm:min-h-11 sm:h-auto sm:rounded-none sm:py-3 sm:px-4",
								"sm:bg-primary sm:text-primary-foreground",
								"sm:shadow-lg sm:shadow-black/20",
								// Active/hover desktop - feedback visuel clair
								"sm:hover:bg-primary/85 sm:hover:shadow-xl sm:hover:-translate-y-0.5",
								"sm:active:bg-primary/90 sm:active:shadow-md sm:active:translate-y-0",
								// Transitions
								"motion-safe:transition-all motion-safe:duration-200"
							),
					// Disabled (commun)
					"disabled:hover:scale-100 disabled:cursor-not-allowed",
					// Animation pulse + ring pendant le chargement
					isPending && "motion-safe:animate-pulse ring-2 ring-primary/30"
				)}
				aria-label={`Ajouter ${productTitle ?? "ce produit"} au panier`}
			>
				{isMobileFull ? (
					// Mobile full-width: icône + texte ou spinner
					isPending ? (
						<Loader2 size={18} className="animate-spin" aria-hidden="true" />
					) : (
						<span className="inline-flex items-center gap-2">
							<ShoppingCart size={18} className="text-foreground/70" aria-hidden="true" />
							<span className="text-sm font-medium">Ajouter</span>
						</span>
					)
				) : (
					<>
						{/* Mobile icon: icone ShoppingCart + drop-shadow */}
						<ShoppingCart
							size={20}
							strokeWidth={2}
							className={cn(
								"sm:hidden text-primary",
								"drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
								"motion-safe:transition-all motion-safe:duration-200",
								isPending && "opacity-60"
							)}
							aria-hidden="true"
						/>
						{/* Desktop: texte */}
						<span className="hidden sm:inline text-sm font-medium">
							Ajouter au panier
						</span>
					</>
				)}
			</Button>
		</form>
	);
}
