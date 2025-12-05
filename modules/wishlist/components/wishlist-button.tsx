"use client";

import { HeartIcon } from "@/shared/components/icons/heart-icon";
import { Button } from "@/shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useWishlistToggle } from "@/modules/wishlist/hooks/use-wishlist-toggle";
import { cn } from "@/shared/utils/cn";

interface WishlistButtonProps {
	skuId: string;
	isInWishlist: boolean;
	variant?: "detail" | "card";
	productTitle?: string;
	className?: string;
	/** Si true, le produit a plusieurs variantes et nécessite le drawer */
	hasMultipleVariants?: boolean;
	/** Callback pour ouvrir le drawer de sélection */
	onOpenDrawer?: () => void;
}

/**
 * Bouton Wishlist unifié - Client Component
 *
 * Deux variants :
 * - `detail` : Page produit, avec tooltip, toujours visible
 * - `card` : Cartes produit, sans tooltip, visible au hover
 *
 * Optimistic UI pour feedback instantané.
 * Si hasMultipleVariants: ouvre le drawer au lieu d'ajouter directement.
 */
export function WishlistButton({
	skuId,
	isInWishlist: initialIsInWishlist,
	variant = "detail",
	productTitle,
	className,
	hasMultipleVariants = false,
	onOpenDrawer,
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

	// Variant: detail (page produit)
	if (variant === "detail") {
		return (
			<TooltipProvider>
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<form action={action} className={className}>
							<input type="hidden" name="skuId" value={skuId} />
							<Button
								type="submit"
								variant="ghost"
								size="icon"
								disabled={isPending}
								aria-disabled={isPending}
								className="relative group h-10 w-10 rounded-full hover:bg-accent hover:scale-110 motion-safe:transition-all motion-safe:duration-300 disabled:opacity-50"
								aria-label={ariaLabel}
								aria-pressed={isInWishlist}
							>
								<HeartIcon
									variant={isInWishlist ? "filled" : "outline"}
									size={22}
									decorative
									className={cn(
										"motion-safe:transition-all motion-safe:duration-300",
										isInWishlist
											? "text-primary scale-110"
											: "text-muted-foreground group-hover:text-primary"
									)}
								/>
							</Button>
						</form>
					</TooltipTrigger>
					<TooltipContent side="bottom" sideOffset={5}>
						<p className="text-xs">
							{isInWishlist
								? "Retirer de la wishlist"
								: "Ajouter à la wishlist"}
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	// Variant: card (cartes produit)
	// Si multi-variantes et callback fourni, ouvrir le drawer au click
	const shouldOpenDrawer = variant === "card" && hasMultipleVariants && onOpenDrawer;

	const handleCardClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (shouldOpenDrawer) {
			onOpenDrawer?.();
		}
	};

	// Pour les produits multi-variantes avec variant card, bouton qui ouvre le drawer
	if (shouldOpenDrawer) {
		return (
			<div
				className={cn(
					"absolute top-2.5 right-2.5 z-20",
					"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100",
					"transition-opacity duration-200",
					className
				)}
			>
				<button
					type="button"
					onClick={handleCardClick}
					className={cn(
						"h-9 w-9 rounded-full",
						"flex items-center justify-center",
						"hover:scale-110 active:scale-95",
						"motion-safe:transition-all motion-safe:duration-300",
						"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
					)}
					aria-label={`Choisir les options pour ajouter ${productTitle ?? "ce produit"} à la wishlist`}
				>
					<HeartIcon
						variant={isInWishlist ? "filled" : "outline"}
						size={22}
						decorative
						className={cn(
							"motion-safe:transition-all motion-safe:duration-300",
							"drop-shadow-[0_0_3px_rgba(255,255,255,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
							isInWishlist &&
								"scale-110 drop-shadow-[0_0_6px_rgba(215,168,178,0.7)]"
						)}
					/>
				</button>
			</div>
		);
	}

	// Variant card standard (mono-SKU ou sans callback)
	return (
		<form
			action={action}
			className={cn(
				"absolute top-2.5 right-2.5 z-20",
				"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100",
				"transition-opacity duration-200",
				className
			)}
		>
			<input type="hidden" name="skuId" value={skuId} />
			<button
				type="submit"
				disabled={isPending}
				aria-disabled={isPending}
				onClick={(e) => e.stopPropagation()}
				className={cn(
					"h-9 w-9 rounded-full",
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
						isInWishlist &&
							"scale-110 drop-shadow-[0_0_6px_rgba(215,168,178,0.7)]"
					)}
				/>
			</button>
		</form>
	);
}
