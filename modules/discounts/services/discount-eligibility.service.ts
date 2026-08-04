import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type {
	DiscountValidation,
	DiscountApplicationContext,
	EligibilityCheckResult,
} from "../types/discount.types";

// Re-export des fonctions de validation pure depuis services/
type UsageCounts = {
	emailCount: number;
};

/**
 * Vérifie toutes les conditions d'éligibilité d'un code promo
 * Pure function: no I/O, usage counts must be provided by the caller.
 *
 * Conditions vérifiées :
 * 1. Code actif
 * 2. Date de fin (endsAt) — il n'y a pas de date de début : un code est
 *    utilisable dès sa création (cf. drop de `startsAt`, 2026-08-04)
 * 3. Montant minimum de commande (appliqué sur subtotal hors frais de port)
 * 4. Limite d'utilisation globale (maxUsageCount)
 * 5. Limite d'utilisation par utilisateur (maxUsagePerUser) + guest checkout par email
 */
export function checkDiscountEligibility(
	discount: DiscountValidation,
	context: DiscountApplicationContext,
	usageCounts?: UsageCounts,
): EligibilityCheckResult {
	const { subtotal, customerEmail } = context;

	// 1. Vérifier si actif
	if (!discount.isActive) {
		return { eligible: false, error: DISCOUNT_ERROR_MESSAGES.NOT_ACTIVE };
	}

	// 2. Vérifier la date de fin
	if (discount.endsAt && new Date() > discount.endsAt) {
		return { eligible: false, error: DISCOUNT_ERROR_MESSAGES.EXPIRED };
	}

	// 3. Vérifier le montant minimum (sur subtotal, hors frais de port)
	if (discount.minOrderAmount && subtotal < discount.minOrderAmount) {
		const minAmount = (discount.minOrderAmount / 100).toFixed(2);
		return {
			eligible: false,
			error: DISCOUNT_ERROR_MESSAGES.MIN_ORDER_NOT_MET.replace("{amount}", minAmount),
		};
	}

	// 4. Vérifier le nombre max d'utilisations global
	if (discount.maxUsageCount && discount.usageCount >= discount.maxUsageCount) {
		return { eligible: false, error: DISCOUNT_ERROR_MESSAGES.MAX_USAGE_REACHED };
	}

	// 5. Vérifier le nombre max d'utilisations par personne
	//
	// [[DISC-USAGE-001]] L'identité est l'EMAIL DE COMMANDE, seule dimension
	// restante depuis le retrait de `DiscountUsage.userId` (Lot 0 S1.5 — le
	// parcours est 100 % invité, un compteur par compte ne comptait plus rien).
	// L'email est normalisé (lowercase+trim) par l'appelant pour empêcher le
	// contournement trivial par casse/espaces (cf [[CHECKOUT-AUDIT-003]]).
	// Sans email on laisse passer : la vérification aura lieu à la création de
	// la commande, avec l'email de commande.
	if (discount.maxUsagePerUser && usageCounts && customerEmail) {
		if (usageCounts.emailCount >= discount.maxUsagePerUser) {
			return {
				eligible: false,
				error: DISCOUNT_ERROR_MESSAGES.USER_MAX_USAGE_REACHED,
			};
		}
	}

	return { eligible: true };
}
