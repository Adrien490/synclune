import { prisma } from "@/shared/lib/prisma";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type { DiscountValidation, DiscountApplicationContext } from "../types/discount.types";

export type EligibilityCheckResult = {
	eligible: boolean;
	error?: string;
};

/**
 * Vérifie toutes les conditions d'éligibilité d'un code promo
 *
 * Conditions vérifiées :
 * 1. Code actif
 * 2. Montant minimum de commande (appliqué sur subtotal hors frais de port)
 * 3. Limite d'utilisation globale (maxUsageCount)
 * 4. Limite d'utilisation par utilisateur (maxUsagePerUser)
 * 5. Pour guest checkout : vérification par email
 */
export async function checkDiscountEligibility(
	discount: DiscountValidation,
	context: DiscountApplicationContext
): Promise<EligibilityCheckResult> {
	const { subtotal, userId, customerEmail } = context;

	// 1. Vérifier si actif
	if (!discount.isActive) {
		return { eligible: false, error: DISCOUNT_ERROR_MESSAGES.NOT_ACTIVE };
	}

	// 2. Vérifier le montant minimum (sur subtotal, hors frais de port)
	if (discount.minOrderAmount && subtotal < discount.minOrderAmount) {
		const minAmount = (discount.minOrderAmount / 100).toFixed(2);
		return {
			eligible: false,
			error: DISCOUNT_ERROR_MESSAGES.MIN_ORDER_NOT_MET.replace(
				"{amount}",
				minAmount
			),
		};
	}

	// 4. Vérifier le nombre max d'utilisations global
	if (discount.maxUsageCount && discount.usageCount >= discount.maxUsageCount) {
		return { eligible: false, error: DISCOUNT_ERROR_MESSAGES.MAX_USAGE_REACHED };
	}

	// 5. Vérifier le nombre max d'utilisations par utilisateur
	if (discount.maxUsagePerUser) {
		if (userId) {
			// Utilisateur connecté : vérifier par userId
			const userUsageCount = await prisma.discountUsage.count({
				where: {
					discountId: discount.id,
					userId: userId,
				},
			});

			if (userUsageCount >= discount.maxUsagePerUser) {
				return {
					eligible: false,
					error: DISCOUNT_ERROR_MESSAGES.USER_MAX_USAGE_REACHED,
				};
			}
		} else if (customerEmail) {
			// Guest checkout : vérifier par email via les commandes
			// On cherche les commandes avec cet email qui ont utilisé ce discount
			const emailUsageCount = await prisma.discountUsage.count({
				where: {
					discountId: discount.id,
					order: {
						customerEmail: customerEmail,
					},
				},
			});

			if (emailUsageCount >= discount.maxUsagePerUser) {
				return {
					eligible: false,
					error: DISCOUNT_ERROR_MESSAGES.USER_MAX_USAGE_REACHED,
				};
			}
		}
		// Si ni userId ni customerEmail, on ne peut pas vérifier - on laisse passer
		// (sera vérifié au moment du paiement avec l'email de la commande)
	}

	return { eligible: true };
}

/**
 * Vérifie si un discount est actuellement valide (sans contexte utilisateur)
 * Utilisé pour l'affichage dans l'admin
 */
export function isDiscountCurrentlyValid(discount: DiscountValidation): boolean {
	if (!discount.isActive) return false;

	if (
		discount.maxUsageCount &&
		discount.usageCount >= discount.maxUsageCount
	) {
		return false;
	}

	return true;
}

/**
 * Retourne le statut textuel d'un discount
 */
export function getDiscountStatus(
	discount: DiscountValidation
): "active" | "inactive" | "exhausted" {
	if (!discount.isActive) return "inactive";

	if (
		discount.maxUsageCount &&
		discount.usageCount >= discount.maxUsageCount
	) {
		return "exhausted";
	}

	return "active";
}
