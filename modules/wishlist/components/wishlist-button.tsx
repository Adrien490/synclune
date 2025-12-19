"use client";

import { HeartIcon } from "@/shared/components/icons/heart-icon";
import { useWishlistToggle } from "@/modules/wishlist/hooks/use-wishlist-toggle";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/ui/button";

type WishlistButtonSize = "sm" | "md" | "lg";

interface WishlistButtonProps {
	skuId: string;
	isInWishlist: boolean;
	productTitle?: string;
	className?: string;
	/** Taille du bouton: sm (36px), md (44px - défaut), lg (56px) */
	size?: WishlistButtonSize;
}

const sizeConfig: Record<WishlistButtonSize, { button: string; icon: number }> = {
	sm: { button: "size-9", icon: 16 },
	md: { button: "size-11", icon: 20 },
	lg: { button: "size-14", icon: 26 },
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
 *   <WishlistButton skuId={sku.id} isInWishlist={false} />
 * </div>
 * ```
 */
export function WishlistButton({
	skuId,
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

	return (
		<form action={action} className={className}>
			<input type="hidden" name="skuId" value={skuId} />
			<Button
				type="submit"
				variant="ghost"
				size="icon"
				disabled={isPending}
				onClick={(e) => e.stopPropagation()}
				className={cn(
					// Taille configurable (md = 44px conforme WCAG 2.5.5)
					buttonSize,
					"rounded-full",
					"can-hover:hover:scale-110 hover:bg-transparent active:scale-95",
					"motion-safe:transition-all motion-safe:duration-200",
					// Animation pulse + ring pendant le chargement pour feedback visuel
					isPending && "motion-safe:animate-pulse ring-2 ring-primary/30",
					"disabled:cursor-not-allowed"
				)}
				aria-label={ariaLabel}
				aria-pressed={isInWishlist}
				aria-busy={isPending}
			>
				<HeartIcon
					variant={isInWishlist ? "filled" : "outline"}
					size={iconSize}
					decorative
					className={cn(
						"motion-safe:transition-all motion-safe:duration-200",
						"drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
						isInWishlist && "motion-safe:scale-110 drop-shadow-[0_0_6px_rgba(215,168,178,0.7)]",
						// Opacité réduite pendant le chargement
						isPending && "opacity-60"
					)}
				/>
			</Button>
		</form>
	);
}
