"use client";

import { useState } from "react";
import { AnimatedHeartIcon } from "@/shared/components/icons/animated-heart-icon";
import { HeartBurst } from "@/shared/components/animations/heart-burst";
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

const sizeConfig: Record<WishlistButtonSize, { button: string; icon: string; burst: number }> = {
	sm: { button: "size-9", icon: "size-4", burst: 0.85 },
	md: { button: "size-11", icon: "size-5", burst: 1 },
	lg: { button: "size-14", icon: "size-8 sm:size-7", burst: 1.25 },
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
	// Compteur incrémenté à chaque ajout pour remonter (= re-jouer) le burst de cœurs.
	const [burstKey, setBurstKey] = useState(0);

	const { isInWishlist, action, isPending } = useWishlistToggle({
		initialIsInWishlist,
		enableUndoToast,
		productTitle,
	});

	const { button: buttonSize, icon: iconSize, burst: burstScale } = sizeConfig[size];

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
			type="submit"
			variant="ghost"
			size="icon"
			onClick={(e) => {
				e.stopPropagation();
				// Burst urgent (hors transition de la form action) → joue au clic, pas
				// après le serveur. Un setState dans l'action de formulaire ne serait commit
				// qu'à la résolution serveur ; ici l'événement discret commit immédiatement.
				if (!isInWishlist) setBurstKey((k) => k + 1);
			}}
			disabled={isPending}
			className={cn(
				buttonSize,
				"rounded-full",
				"can-hover:hover:scale-110 hover:bg-transparent active:scale-95",
				"motion-safe:transition-all motion-safe:duration-200",
				// Optimistic UI : le cœur reflète déjà le nouvel état → on garde le bouton
				// vivant (pas de dim `opacity-50`) ; `disabled` ne sert qu'à bloquer le spam
				// pendant la fenêtre pending (re-clics rapides) sans feedback visuel « chargement ».
				"disabled:opacity-100",
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
			{/* Conteneur relatif pour ancrer le burst de cœurs centré sur l'icône, sans
			    toucher au positionnement du `<form>` (parfois absolu, posé par le parent). */}
			<span className="relative inline-flex">
				<Tooltip delayDuration={500}>
					<TooltipTrigger asChild>{button}</TooltipTrigger>
					{/* `can-hover:block hidden` masque le tooltip sur touch (pointer:coarse) pour éviter
					    un flash au tap mobile, tout en gardant l'aide desktop hover/focus. */}
					<TooltipContent side="bottom" className="can-hover:block hidden">
						{tooltipText}
					</TooltipContent>
				</Tooltip>
				{burstKey > 0 && <HeartBurst key={burstKey} seed={burstKey} scale={burstScale} />}
			</span>
		</form>
	);
}
