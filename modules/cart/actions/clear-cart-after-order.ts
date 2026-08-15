"use server";

import { handleActionError, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { clearCartCookie } from "@/modules/cart/lib/cart-cookie";

/**
 * Vide le panier après une commande payée.
 *
 * ## Pourquoi une action séparée, déclenchée depuis le client
 *
 * Le vidage post-paiement était fait par le webhook `payment_intent.succeeded`
 * (`checkout-order-processing.service.ts`, étape 6), qui supprimait les
 * `CartItem` en base. Depuis le passage du panier en cookie (2026-08-04) ce
 * chemin est impossible : un webhook Stripe est un appel serveur-à-serveur, il
 * ne porte aucun cookie du client et n'a donc aucun moyen d'atteindre son
 * panier.
 *
 * Le vidage est donc déclenché au montage de `/paiement/confirmation`, page que
 * l'on n'atteint qu'avec un `order_id` + `order_number` valides. Vider ici
 * plutôt que dans `confirmCheckout` est délibéré : `confirmCheckout` s'exécute
 * AVANT la confirmation Stripe, donc une carte refusée y viderait le panier d'un
 * client qui doit justement pouvoir réessayer.
 *
 * ⚠️ Angle mort assumé : un client qui ferme l'onglet sans revenir sur la page de
 * confirmation garde son cookie. Ses articles réapparaissent au prochain
 * passage — le stock ayant déjà été décrémenté, ils sont simplement re-achetables
 * (ou signalés en rupture par les gardes habituelles).
 *
 * ## Pourquoi aucune garde d'ownership
 *
 * L'action ne touche QUE le cookie de son propre appelant : il n'existe aucun
 * panier d'autrui à atteindre, donc rien à autoriser. Le rate limit reste, lui,
 * obligatoire (`"use server"` publie un endpoint RPC atteignable hors UI).
 */
export async function clearCartAfterOrder(): Promise<ActionState> {
	try {
		await clearCartCookie();

		return success("Panier vidé");
	} catch (e) {
		return handleActionError(e, "Impossible de vider le panier");
	}
}
