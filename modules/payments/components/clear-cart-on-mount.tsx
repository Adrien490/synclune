"use client";

import { useEffect } from "react";
import { clearCartAfterOrder } from "@/modules/cart/actions/clear-cart-after-order";

/**
 * Vide le panier cookie au montage de la page de retour Checkout.
 *
 * C'est le SEUL endroit où le panier peut se vider après un paiement : un
 * webhook serveur-à-serveur ne porte aucun cookie du client. Angle mort
 * assumé : qui ferme l'onglet Stripe sans revenir garde son cookie — les ids
 * de lignes deviennent simplement inertes.
 */
export function ClearCartOnMount() {
	useEffect(() => {
		void clearCartAfterOrder();
	}, []);

	return null;
}
