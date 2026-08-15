"use server";

import { logger } from "@/shared/lib/logger";
import { readCartWithVariants } from "@/modules/cart/services/read-cart-with-variants.service";
import { validateCartItems } from "../services/item-availability.service";
import type { ValidateCartResult } from "../types/cart.types";

/**
 * Valide l'intégralité du panier avant la commande
 *
 * Cette fonction effectue toutes les vérifications critiques :
 * - Existence du VARIANT
 * - Activation du VARIANT (ProductVariant.active = true)
 * - Statut du produit (Product.status = 'PUBLIC')
 * - Disponibilité du stock (variant.stock >= cartItem.quantity)
 *
 * Contraintes métier :
 * - Pas de réservation de stock (principe "first come, first served")
 * - Vérification atomique au moment du checkout
 * - Messages d'erreur explicites pour l'utilisateur
 *
 * Sécurité : le panier vient du cookie de l'appelant, jamais d'un identifiant
 * passé en paramètre — il n'y a aucun panier d'autrui à atteindre.
 *
 * @returns ValidateCartResult avec liste des problèmes détectés
 */
export async function validateCart(): Promise<ValidateCartResult> {
	try {
		// 1. Panier du cookie + VARIANTs frais
		const { cookie, items } = await readCartWithVariants();

		if (cookie.items.length === 0) {
			return {
				isValid: false,
				issues: [],
			};
		}

		// 2. Valider chaque item via le service
		const issues = validateCartItems(items);

		// 3. Retourner le résultat
		return {
			isValid: issues.length === 0,
			issues,
		};
	} catch (error) {
		// Return a structured result with a generic issue so the user gets feedback
		logger.error("[validateCart] Erreur inattendue:", error);
		return {
			isValid: false,
			issues: [
				{
					cartItemId: "unknown",
					variantId: "unknown",
					productTitle: "",
					issueType: "UNKNOWN" as const,
					message: "Une erreur est survenue lors de la validation du panier. Réessaie.",
				},
			],
		};
	}
}
