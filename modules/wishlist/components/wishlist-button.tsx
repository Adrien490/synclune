"use client";

import { HeartIcon } from "@/shared/components/icons/heart-icon";
import { useWishlistToggle } from "@/modules/wishlist/hooks/use-wishlist-toggle";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/ui/button";

type WishlistButtonSize = "sm" | "md" | "lg";

interface WishlistButtonProps {
	productId: string;
	isInWishlist: boolean;
	productTitle?: string;
	className?: string;
	/** Taille du bouton: sm (36px), md (44px - défaut), lg (56px) */
	size?: WishlistButtonSize;
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
}: WishlistButtonProps) {
	const { isInWishlist, action, isPending } = useWishlistToggle({
		initialIsInWishlist,
	});

	const { button: buttonSize, icon: iconSize } = sizeConfig[size];

	const ariaLabel = isInWishlist
		? productTitle
			? `Retirer ${productTitle} de la wishlist`
			: "Retirer de la wishlist"
		: productTitle
			? `Ajouter ${productTitle} à la wishlist`
			: "Ajouter à la wishlist";

	const tooltipText = isInWishlist
		? "Retirer des favoris"
		: "Enregistrer dans mes favoris";

	return (
		<form action={action} className={className}>
			<input type="hidden" name="productId" value={productId} />
			<Button
				type="submit"
				variant="ghost"
				size="icon"
				onClick={(e) => e.stopPropagation()}
				className={cn(
					// Taille configurable (md = 44px conforme WCAG 2.5.5)
					buttonSize,
					"rounded-full",
					"can-hover:hover:scale-110 hover:bg-transparent active:scale-95",
					"motion-safe:transition-all motion-safe:duration-200"
				)}
				aria-label={ariaLabel}
				aria-pressed={isInWishlist}
				aria-busy={isPending}
				title={tooltipText}
			>
				<HeartIcon
					variant={isInWishlist ? "filled" : "outline"}
					decorative
					className={cn(
						// Taille configurable (classes size-* pour bypass Button override)
						iconSize,
						"motion-safe:transition-all motion-safe:duration-200",
						// Drop shadows
						"drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
						// Effet pop subtil au filled (200ms)
						isInWishlist && [
							"drop-shadow-[0_0_6px_rgba(215,168,178,0.6)]",
							"motion-safe:animate-[wishlist-pop_0.2s_cubic-bezier(0.34,1.56,0.64,1)]",
						]
					)}
				/>
			</Button>
		</form>
	);
}
