"use client";

import { Button } from "@/shared/components/ui/button";
import { useSheet } from "@/shared/providers/overlay-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";

/**
 * Ouvre le Sheet panier (monté par le layout via `CartAndSkuWrapper`).
 *
 * Le header du checkout n'a pas de déclencheur panier : sans ce bouton, l'écran
 * « panier invalide » listait les articles bloquants sans offrir aucun moyen de
 * les retirer — il fallait retourner en boutique pour rouvrir le panier.
 */
export function OpenCartButton({ children }: { children: React.ReactNode }) {
	const { isOpen, open: openCart } = useSheet("cart");
	const haptic = useHaptic();

	return (
		<Button
			type="button"
			// Ce bouton ouvre le MÊME Sheet que `CartSheetTrigger`, qui annonce bien
			// sa nature de dialogue et son état. Sans ces deux attributs, celui-ci se
			// présentait comme une action ordinaire : rien ne disait qu'un panneau
			// allait s'ouvrir, ni qu'il était déjà ouvert.
			aria-haspopup="dialog"
			aria-expanded={isOpen}
			onClick={() => {
				haptic("light");
				openCart();
			}}
		>
			{children}
		</Button>
	);
}
