"use server";

import { prisma } from "@/shared/lib/prisma";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { headers } from "next/headers";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getCartSessionId } from "@/modules/cart/lib/cart-session";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";

export interface CartValidationIssue {
	cartItemId: string;
	skuId: string;
	productTitle: string;
	issueType: "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "INACTIVE" | "NOT_PUBLIC" | "DELETED";
	message: string;
	availableStock?: number;
}

export interface ValidateCartResult {
	isValid: boolean;
	issues: CartValidationIssue[];
}

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
 * @param cartId - ID du panier à valider
 * @returns ValidateCartResult avec liste des problèmes détectés
 */
export async function validateCart(cartId: string): Promise<ValidateCartResult> {
	try {
		// 0a. Recuperer les identifiants de session/utilisateur
		const session = await getSession();
		const userId = session?.user?.id;
		const sessionId = await getCartSessionId();

		// 0b. Rate limiting uniforme avec les autres actions cart
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress);
		const rateLimit = checkRateLimit(`validate-cart:${rateLimitId}`, CART_LIMITS.VALIDATE);

		if (!rateLimit.success) {
			return {
				isValid: false,
				issues: [],
			};
		}

		// 1. Recuperer le panier avec verification d'ownership
		const cart = await prisma.cart.findUnique({
			where: {
				id: cartId,
				// Verification ownership: le panier doit appartenir a l'utilisateur ou a la session
				OR: [
					...(userId ? [{ userId }] : []),
					...(sessionId ? [{ sessionId }] : []),
				],
			},
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

		// 2. Valider chaque item
		const issues: CartValidationIssue[] = [];

		for (const item of cart.items) {
			// 2a. Vérifier que le SKU existe (ne devrait jamais arriver avec les contraintes DB)
			if (!item.sku) {
				issues.push({
					cartItemId: item.id,
					skuId: item.skuId,
					productTitle: "Produit supprimé",
					issueType: "DELETED",
					message: CART_ERROR_MESSAGES.PRODUCT_DELETED,
				});
				continue;
			}

			// 2b. Vérifier les soft deletes (SKU ou Product supprimé)
			if (item.sku.deletedAt || item.sku.product.deletedAt) {
				issues.push({
					cartItemId: item.id,
					skuId: item.skuId,
					productTitle: item.sku.product.title,
					issueType: "DELETED",
					message: CART_ERROR_MESSAGES.PRODUCT_DELETED,
				});
				continue;
			}

			// 2c. Vérifier l'activation du SKU
			if (!item.sku.isActive) {
				issues.push({
					cartItemId: item.id,
					skuId: item.skuId,
					productTitle: item.sku.product.title,
					issueType: "INACTIVE",
					message: CART_ERROR_MESSAGES.SKU_INACTIVE,
				});
				continue;
			}

			// 2d. Vérifier le statut du produit
			if (item.sku.product.status !== "PUBLIC") {
				issues.push({
					cartItemId: item.id,
					skuId: item.skuId,
					productTitle: item.sku.product.title,
					issueType: "NOT_PUBLIC",
					message: CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC,
				});
				continue;
			}

			// 2e. Vérifier le stock
			if (item.sku.inventory === 0) {
				issues.push({
					cartItemId: item.id,
					skuId: item.skuId,
					productTitle: item.sku.product.title,
					issueType: "OUT_OF_STOCK",
					message: CART_ERROR_MESSAGES.OUT_OF_STOCK,
					availableStock: 0,
				});
				continue;
			}

			if (item.sku.inventory < item.quantity) {
				issues.push({
					cartItemId: item.id,
					skuId: item.skuId,
					productTitle: item.sku.product.title,
					issueType: "INSUFFICIENT_STOCK",
					message: CART_ERROR_MESSAGES.INSUFFICIENT_STOCK(item.sku.inventory),
					availableStock: item.sku.inventory,
				});
				continue;
			}
		}

		// 3. Retourner le résultat
		return {
			isValid: issues.length === 0,
			issues,
		};
	} catch (error) {
		throw error;
	}
}

/**
 * Variante simplifiée pour vérifier rapidement si le panier est valide
 * @param cartId - ID du panier à vérifier
 * @returns true si valide, false sinon
 */
export async function isCartValid(cartId: string): Promise<boolean> {
	const result = await validateCart(cartId);
	return result.isValid;
}
