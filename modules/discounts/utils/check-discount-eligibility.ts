import { getDiscountUsageCounts } from "../data/get-discount-usage-counts";
import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type {
	DiscountValidation,
	DiscountApplicationContext,
	EligibilityCheckResult,
} from "../types/discount.types";

export type { EligibilityCheckResult } from "../types/discount.types";

// Re-export des fonctions de validation pure depuis services/
export {
	isDiscountCurrentlyValid,
	getDiscountStatus,
	type DiscountStatus,
} from "../services/discount-validation.service";

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
		const { userCount, emailCount } = await getDiscountUsageCounts({
			discountId: discount.id,
			userId,
			customerEmail,
		});

		if (userId && userCount >= discount.maxUsagePerUser) {
			return {
				eligible: false,
				error: DISCOUNT_ERROR_MESSAGES.USER_MAX_USAGE_REACHED,
			};
		}

		if (!userId && customerEmail && emailCount >= discount.maxUsagePerUser) {
			return {
				eligible: false,
				error: DISCOUNT_ERROR_MESSAGES.USER_MAX_USAGE_REACHED,
			};
		}
		// Si ni userId ni customerEmail, on ne peut pas vérifier - on laisse passer
		// (sera vérifié au moment du paiement avec l'email de la commande)
	}

	return { eligible: true };
}
