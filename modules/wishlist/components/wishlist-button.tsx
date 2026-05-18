"use client";

import { useRef } from "react";

import { AnimatedHeartIcon } from "@/shared/components/icons/animated-heart-icon";
import { useWishlistToggle } from "@/modules/wishlist/hooks/use-wishlist-toggle";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

type WishlistButtonSize = "sm" | "md" | "lg";

interface WishlistButtonProps {
	productId: string;
	isInWishlist: boolean;
	productTitle?: string;
	className?: string;
	/**
	 * Taille du bouton.
	 * - `sm` (36px) — **réservé contextes desktop dense** (listes admin). Sous le seuil WCAG 2.5.5 (44px), non recommandé pour cibles touch.
	 * - `md` (44px) — défaut, conforme WCAG 2.5.5.
	 * - `lg` (56px) — PDP hero.
	 */
	size?: WishlistButtonSize;
	/**
	 * Affiche un toast « Annuler » sur retrait. Recommandé sur PDP (un seul produit en vue,
	 * retrait accidentel coûteux). Déconseillé sur grille (trop bruyant). Défaut: `false`.
	 */
	enableUndoToast?: boolean;
}

const sizeConfig: Record<WishlistButtonSize, { button: string; icon: string }> = {
	sm: { button: "size-9", icon: "size-4" },
	md: { button: "size-11", icon: "size-5" },
	lg: { button: "size-14", icon: "size-8 sm:size-7" },
};

/**
 * Bouton Wishlist - Client Component
 *
 * Design unifié avec drop-shadow pour contraste sur images.
 * Optimistic UI pour feedback instantané.
 *
 * @example
 * ```tsx
 * // Dans une carte (positionnement géré par le parent)
 * <div className="absolute top-2.5 right-2.5 z-20">
 *   <WishlistButton productId={product.id} isInWishlist={false} />
 * </div>
 * ```
 */
export function WishlistButton({
	productId,
	isInWishlist: initialIsInWishlist,
	productTitle,
	className,
	size = "md",
	enableUndoToast = false,
}: WishlistButtonProps) {
	const triggerRef = useRef<HTMLButtonElement>(null);
	const { isInWishlist, action, isPending } = useWishlistToggle({
		initialIsInWishlist,
		enableUndoToast,
		productTitle,
		getTriggerRect: () => triggerRef.current?.getBoundingClientRect() ?? null,
	});

	const { button: buttonSize, icon: iconSize } = sizeConfig[size];

	const ariaLabel = isInWishlist
		? productTitle
			? `Retirer ${productTitle} des favoris`
			: "Retirer des favoris"
		: productTitle
			? `Ajouter ${productTitle} aux favoris`
			: "Ajouter aux favoris";

	const tooltipText = isInWishlist ? "Retirer des favoris" : "Enregistrer dans mes favoris";

	const button = (
		<Button
			ref={triggerRef}
			type="submit"
			variant="ghost"
			size="icon"
			onClick={(e) => {
				e.stopPropagation();
			}}
			className={cn(
				buttonSize,
				"rounded-full",
				"can-hover:hover:scale-110 hover:bg-transparent active:scale-95",
				"motion-safe:transition-all motion-safe:duration-200",
			)}
			aria-label={ariaLabel}
			aria-pressed={isInWishlist}
			aria-busy={isPending}
		>
			<AnimatedHeartIcon
				variant={isInWishlist ? "filled" : "outline"}
				decorative
				className={cn(
					iconSize,
					"drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
					isInWishlist &&
						"[filter:drop-shadow(0_0_6px_color-mix(in_oklab,var(--primary)_60%,transparent))]",
				)}
			/>
		</Button>
	);

	return (
		<form action={action} className={className}>
			<input type="hidden" name="productId" value={productId} />
			<Tooltip delayDuration={500}>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				{/* `can-hover:block hidden` masque le tooltip sur touch (pointer:coarse) pour éviter
				    un flash au tap mobile, tout en gardant l'aide desktop hover/focus. */}
				<TooltipContent side="bottom" className="can-hover:block hidden">
					{tooltipText}
				</TooltipContent>
			</Tooltip>
		</form>
	);
}
