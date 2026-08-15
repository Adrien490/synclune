"use server";

import { handleActionError, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { clearCartCookie } from "@/modules/cart/lib/cart-cookie";

/**
 * Vide le panier cookie après un paiement parti chez Stripe.
 *
 * ## Pourquoi une action séparée, déclenchée depuis le client
 *
 * Déclenchée au montage de la page de retour Checkout (`/paiement/retour`,
 * `ClearCartOnMount` de `modules/payments`) — le SEUL endroit possible : le
 * webhook `checkout.session.completed` est un appel serveur-à-serveur qui ne
 * porte aucun cookie du client, il ne peut pas atteindre son panier. La page
 * d'annulation ne l'appelle jamais : une carte refusée ou un abandon garde le
 * panier, la cliente doit pouvoir réessayer telle quelle.
 *
 * ⚠️ Angle mort assumé : une cliente qui ferme l'onglet Stripe sans revenir sur
 * la page de retour garde son cookie. Ses articles réapparaissent au prochain
 * passage — le stock ayant déjà été décrémenté, ils sont simplement
 * re-achetables (ou signalés en rupture par les gardes habituelles).
 *
 * ## Pourquoi aucune garde d'ownership
 *
 * L'action ne touche QUE le cookie de son propre appelant : il n'existe aucun
 * panier d'autrui à atteindre, donc rien à autoriser. `"use server"` publie
 * bien un endpoint RPC atteignable hors UI, mais le pire qu'un appel hostile
 * obtienne est de vider son propre panier.
 */
export async function clearCartAfterOrder(): Promise<ActionState> {
	try {
		await clearCartCookie();

		return success("Panier vidé");
	} catch (e) {
		return handleActionError(e, "Impossible de vider le panier");
	}
}
