"use client";

import { HeartIcon } from "@/shared/components/icons/heart-icon";
import { useWishlistToggle } from "@/modules/wishlist/hooks/use-wishlist-toggle";
import { cn } from "@/shared/utils/cn";

interface WishlistButtonProps {
	skuId: string;
	isInWishlist: boolean;
	productTitle?: string;
	className?: string;
}

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
}: WishlistButtonProps) {
	const { isInWishlist, action, isPending } = useWishlistToggle({
		initialIsInWishlist,
	});

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
			<button
				type="submit"
				disabled={isPending}
				onClick={(e) => e.stopPropagation()}
				className={cn(
					// Taille 44px conforme WCAG 2.5.5 (cible tactile minimum)
					"h-11 w-11 rounded-full",
					"flex items-center justify-center",
					"hover:scale-110 active:scale-95",
					"motion-safe:transition-all motion-safe:duration-300",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
					"disabled:opacity-50 disabled:cursor-not-allowed"
				)}
				aria-label={ariaLabel}
				aria-pressed={isInWishlist}
			>
				<HeartIcon
					variant={isInWishlist ? "filled" : "outline"}
					size={22}
					decorative
					className={cn(
						"motion-safe:transition-all motion-safe:duration-300",
						"drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
						isInWishlist && "scale-110 drop-shadow-[0_0_6px_rgba(215,168,178,0.7)]"
					)}
				/>
			</button>
		</form>
	);
}
