"use client";

import { CART_TARGET_ATTR } from "@/modules/cart/lib/fly-to-cart";
import { useSheet } from "@/shared/providers/overlay-store-provider";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { CartBadge } from "./cart-badge";
import { ShoppingBagIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/shared/utils/cn";

interface CartSheetTriggerProps {
	className?: string;
	ref?: React.Ref<HTMLButtonElement>;
}

/**
 * Bouton trigger pour ouvrir le cart sheet
 */
export function CartSheetTrigger({ className, ref }: CartSheetTriggerProps) {
	const { isOpen, open } = useSheet("cart");
	const count = useBadgeCountsStore((state) => state.cartCount);

	/*
	 * ⚠️ Le compte fait partie du NOM du bouton.
	 *
	 * `aria-label="Ouvrir mon panier"` écrasait le contenu : le texte sr-only du
	 * `CountBadge`, pourtant enfant de ce bouton, ne participait pas au nom
	 * accessible. Un utilisateur qui tabulait jusqu'ici entendait « Ouvrir mon
	 * panier », sans jamais savoir combien d'articles s'y trouvent — le nombre
	 * n'était annoncé qu'au moment d'un CHANGEMENT, par la région live du badge.
	 *
	 * Le nom reste dérivé du même compteur que le badge : une seule source.
	 */
	const label =
		count > 0
			? `Ouvrir mon panier, ${count} article${count > 1 ? "s" : ""}`
			: "Ouvrir mon panier, vide";

	return (
		<button
			ref={ref}
			type="button"
			onClick={open}
			className={cn("group focus-ring relative", className)}
			aria-label={label}
			aria-expanded={isOpen}
			aria-haspopup="dialog"
			{...{ [CART_TARGET_ATTR]: "" }}
		>
			<ShoppingBagIcon
				size={20}
				className="transition-transform duration-300 ease-out group-hover:scale-105"
				aria-hidden="true"
			/>
			<CartBadge />
		</button>
	);
}
