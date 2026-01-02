"use server";

import { prisma } from "@/shared/lib/prisma";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { validateCartItems } from "../services/item-availability.service";
import type { ValidateCartResult } from "../types/cart.types";

// Re-export pour retrocompatibilite
export type { CartValidationIssue, ValidateCartResult } from "../types/cart.types";

/**
 * Valide l'intégralité du panier avant la commande
 *
 * Cette fonction effectue toutes les vérifications critiques :
 * - Existence du SKU
 * - Activation du SKU (ProductSku.isActive = true)
 * - Statut du produit (Product.status = 'PUBLIC')
 * - Disponibilité du stock (sku.inventory >= cartItem.quantity)
 *
 * Contraintes métier :
 * - Pas de réservation de stock (principe "first come, first served")
 * - Vérification atomique au moment du checkout
 * - Messages d'erreur explicites pour l'utilisateur
 *
 * Sécurité :
 * - Le panier est récupéré par userId/sessionId (pas de paramètre cartId)
 * - Empêche les attaques IDOR (accès aux paniers d'autres utilisateurs)
 *
 * @returns ValidateCartResult avec liste des problèmes détectés
 */
export async function validateCart(): Promise<ValidateCartResult> {
	try {
		// 0a. Rate limiting + récupération contexte
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.VALIDATE);
		if (!rateLimitResult.success) {
			return {
				isValid: false,
				issues: [],
				rateLimited: true,
			};
		}
		const { userId, sessionId } = rateLimitResult.context;

		// 0b. Vérifier qu'on a au moins un identifiant (userId ou sessionId)
		if (!userId && !sessionId) {
			return {
				isValid: false,
				issues: [],
			};
		}

		// 1. Recuperer le panier par userId ou sessionId (sécurisé - pas de cartId externe)
		const cart = await prisma.cart.findFirst({
			where: userId ? { userId } : { sessionId: sessionId! },
			select: {
				id: true,
				items: {
					select: {
						id: true,
						skuId: true,
						quantity: true,
						sku: {
							select: {
								id: true,
								isActive: true,
								inventory: true,
								deletedAt: true,
								product: {
									select: {
										id: true,
										title: true,
										status: true,
										deletedAt: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!cart) {
			return {
				isValid: false,
				issues: [],
			};
		}

		// 2. Valider chaque item via le service
		const issues = validateCartItems(cart.items);

		// 3. Retourner le résultat
		return {
			isValid: issues.length === 0,
			issues,
		};
	} catch (error) {
		// Retourner un résultat structuré au lieu de throw
		// pour rester cohérent avec le type ValidateCartResult
		console.error("[validateCart] Erreur inattendue:", error);
		return {
			isValid: false,
			issues: [],
		};
	}
}

/**
 * Variante simplifiée pour vérifier rapidement si le panier est valide
 * @returns true si valide, false sinon
 */
export async function isCartValid(): Promise<boolean> {
	const result = await validateCart();
	return result.isValid;
}
