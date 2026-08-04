"use client";

import { useAddToCart } from "@/modules/cart/hooks/use-add-to-cart";
import { dispatchFlyToCart } from "@/modules/cart/lib/fly-to-cart";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import { SKU_SELECTOR_DIALOG_ID } from "./sku-selector-dialog";
import { cn } from "@/shared/utils/cn";
import { ShoppingBagIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { Button } from "@/shared/components/ui/button";

interface AddToCartCardButtonProps {
	skuId: string;
	productTitle?: string;
	/**
	 * Produit complet pour déterminer si une sélection de variante est nécessaire.
	 * Required pour ouvrir le dialog de sélection SKU si le produit a plusieurs variantes.
	 */
	product: ProductCarouselItem;
	/** Couleur pré-sélectionnée depuis les swatches de la ProductCard */
	preselectedColor?: string | null;
	/** Variante d'affichage: "icon" (défaut) ou "mobile-full" (pleine largeur mobile) */
	variant?: "icon" | "mobile-full";
	className?: string;
}

/**
 * Bouton d'ajout au panier pour les cartes produit (redesign Atelier 2026-08-03)
 *
 * Deux variants:
 * - "icon" (desktop, masqué < sm par le call site) : pastille arrondie
 *   « Ajouter au panier » posée sur la photo, révélée au survol ET au
 *   focus clavier (parité WCAG 2.4.7, verrouillée par hover-focus-parity) ;
 *   toujours visible sur tactile ≥ sm sans hover fin (iPad, paysage)
 * - "mobile-full" : pleine largeur en pilule primary, cohérent avec le
 *   bouton primaire du site
 *
 * - Disabled pendant le pending pour éviter double-click
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
	const activeSkusCount = product.skus.filter((s) => s.isActive).length;
	const hasMultipleVariants = activeSkusCount > 1;

	// Handler de clic : ouvre le dialog si plusieurs variantes, sinon soumet le formulaire
	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();

		if (hasMultipleVariants) {
			// Plusieurs variantes : ouvrir le dialog de sélection
			e.preventDefault();
			openSkuSelector({ product, preselectedColor });
		} else {
			// Single SKU: trigger fly-to-cart animation
			dispatchFlyToCart(e.currentTarget);
		}
	};

	return (
		<form
			action={action}
			className={cn(
				isMobileFull
					? // Mobile full-width: position relative dans le flux
						"relative w-full"
					: // Icon variant: pastille centrée en bas de la photo, révélée au
						// survol de la carte et au focus clavier (translate + opacity).
						// Le MASQUAGE est gaté `can-hover:` (pas seulement le reveal) : sur
						// tactile ≥ sm (iPad, téléphone paysage) aucun survol ne peut révéler
						// la pastille, et un bouton opacity-0 resterait cliquable au-dessus
						// du stretched link — elle reste donc visible en permanence là-bas.
						cn(
							"absolute bottom-2.5 left-1/2 z-30 -translate-x-1/2",
							"sm:can-hover:group-hover:translate-y-0 sm:can-hover:group-hover:opacity-100 sm:can-hover:translate-y-2 sm:can-hover:opacity-0 opacity-100 sm:focus-within:translate-y-0 sm:focus-within:opacity-100",
							"duration-300 motion-safe:transition-[opacity,transform]",
						),
				className,
			)}
		>
			<input type="hidden" name="skuId" value={skuId} />
			<input type="hidden" name="quantity" value="1" />
			<Button
				type="submit"
				disabled={isPending}
				aria-busy={isPending}
				onClick={handleClick}
				size="default"
				className={cn(
					isMobileFull
						? // Mobile full-width: pilule primary pleine largeur — le CTA le plus
							// vu de la boutique porte la couleur du bouton primaire du site
							// (WCAG 2.5.5 tap target conservé h-11)
							cn(
								"h-11 w-full rounded-full",
								"bg-primary text-primary-foreground",
								"can-hover:hover:bg-primary/85",
								"active:bg-primary/90 active:scale-[0.98]",
								"text-sm font-medium",
								"motion-safe:transition-all motion-safe:duration-200",
							)
						: // Icon variant: pastille arrondie posée sur la photo
							cn(
								"h-11 gap-2 rounded-full px-4",
								"bg-primary text-primary-foreground",
								"shadow-lg shadow-black/20",
								"can-hover:hover:bg-primary/85 can-hover:hover:-translate-y-0.5 can-hover:hover:shadow-xl",
								"active:bg-primary/90 active:translate-y-0 active:shadow-md",
								"motion-safe:transition-all motion-safe:duration-200",
							),
					// Disabled (commun)
					"disabled:cursor-not-allowed disabled:hover:scale-100",
					// Animation pulse + ring pendant le chargement
					isPending && "ring-primary/30 ring-2 motion-safe:animate-pulse",
				)}
				aria-label={`Ajouter ${productTitle ?? "ce produit"} au panier`}
			>
				{isMobileFull ? (
					// Mobile full-width: icône + texte ou spinner
					isPending ? (
						<Spinner presentational />
					) : (
						<span className="inline-flex items-center gap-2">
							<ShoppingBagIcon size={18} aria-hidden="true" />
							<span className="text-sm font-medium">Ajouter</span>
						</span>
					)
				) : (
					<>
						<ShoppingBagIcon
							size={18}
							className={cn("shrink-0", isPending && "opacity-60")}
							aria-hidden="true"
						/>
						<span className="text-sm font-medium">Ajouter au panier</span>
					</>
				)}
			</Button>
		</form>
	);
}
