"use client";

import { Button } from "@/shared/components/ui/button";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";

/**
 * Ouvre le Sheet panier (monté par le layout via `CartAndSkuWrapper`).
 *
 * Le header du checkout n'a pas de déclencheur panier : sans ce bouton, l'écran
 * « panier invalide » listait les articles bloquants sans offrir aucun moyen de
 * les retirer — il fallait retourner en boutique pour rouvrir le panier.
 */
export function OpenCartButton({ children }: { children: React.ReactNode }) {
	const { open: openCart } = useSheet("cart");
	const haptic = useHaptic();

	return (
		<Button
			type="button"
			onClick={() => {
				haptic("light");
				openCart();
			}}
		>
			{children}
		</Button>
	);
}
