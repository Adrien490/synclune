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
 * 2. Période de validité (startsAt / endsAt)
 * 3. Montant minimum de commande (appliqué sur subtotal hors frais de port)
 * 4. Limite d'utilisation globale (maxUsageCount)
 * 5. Limite d'utilisation par utilisateur (maxUsagePerUser)
 * 6. Pour guest checkout : vérification par email
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

	// 2. Vérifier la période de validité
	const now = new Date();

	if (discount.startsAt && now < discount.startsAt) {
		return { eligible: false, error: DISCOUNT_ERROR_MESSAGES.NOT_YET_VALID };
	}

	if (discount.endsAt && now > discount.endsAt) {
		return { eligible: false, error: DISCOUNT_ERROR_MESSAGES.EXPIRED };
	}

	// 3. Vérifier le montant minimum (sur subtotal, hors frais de port)
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

	const now = new Date();

	if (discount.startsAt && now < discount.startsAt) return false;
	if (discount.endsAt && now > discount.endsAt) return false;
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
): "active" | "inactive" | "expired" | "scheduled" | "exhausted" {
	if (!discount.isActive) return "inactive";

	const now = new Date();

	if (discount.startsAt && now < discount.startsAt) return "scheduled";
	if (discount.endsAt && now > discount.endsAt) return "expired";
	if (
		discount.maxUsageCount &&
		discount.usageCount >= discount.maxUsageCount
	) {
		return "exhausted";
	}

	return "active";
}
