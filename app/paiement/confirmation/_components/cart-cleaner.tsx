"use client";

import { useEffect, useRef } from "react";
import { clearCartAfterOrder } from "@/modules/cart/actions/clear-cart-after-order";

/**
 * Vide le cookie panier à l'arrivée sur la page de confirmation.
 *
 * Composant client parce qu'un Server Component ne peut pas écrire de cookie
 * (`cookies().set()` throw pendant un rendu) : il faut une Server Action, donc un
 * déclencheur côté client. Cf. `clearCartAfterOrder` pour la raison profonde —
 * le webhook Stripe n'a aucun accès au cookie du client.
 *
 * Ne rend rien. Best-effort : un échec laisse simplement le panier en place, ce
 * qui n'empêche ni la commande ni sa consultation.
 */
export function CartCleaner() {
	const hasRun = useRef(false);

	useEffect(() => {
		// StrictMode monte deux fois en dev — le garde évite un second appel inutile.
		if (hasRun.current) return;
		hasRun.current = true;

		void clearCartAfterOrder();
	}, []);

	return null;
}
