import { DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import type {
	DiscountValidation,
	DiscountApplicationContext,
	EligibilityCheckResult,
} from "../types/discount.types";

// Re-export des fonctions de validation pure depuis services/
type UsageCounts = {
	userCount: number;
	emailCount: number;
};

/**
 * Vérifie toutes les conditions d'éligibilité d'un code promo
 * Pure function: no I/O, usage counts must be provided by the caller.
 *
 * Conditions vérifiées :
 * 1. Code actif
 * 2. Période de validité (startsAt / endsAt)
 * 3. Montant minimum de commande (appliqué sur subtotal hors frais de port)
 * 4. Limite d'utilisation globale (maxUsageCount)
 * 5. Limite d'utilisation par utilisateur (maxUsagePerUser) + guest checkout par email
 */
export function checkDiscountEligibility(
	discount: DiscountValidation,
	context: DiscountApplicationContext,
	usageCounts?: UsageCounts,
): EligibilityCheckResult {
	const { subtotal, userId, customerEmail } = context;

	// 1. Vérifier si actif
	if (!discount.isActive) {
		return { eligible: false, error: DISCOUNT_ERROR_MESSAGES.NOT_ACTIVE };
	}

	// 2. Vérifier la période de validité (startsAt / endsAt)
	const now = new Date();
	if (now < discount.startsAt) {
		return { eligible: false, error: DISCOUNT_ERROR_MESSAGES.NOT_YET_ACTIVE };
	}
	if (discount.endsAt && now > discount.endsAt) {
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

	// 5. Vérifier le nombre max d'utilisations par utilisateur
	//
	// [[DISC-USAGE-001]] On teste TOUJOURS les deux compteurs, jamais l'un OU
	// l'autre selon la présence de `userId`. Un usage invité est enregistré avec
	// `userId: NULL` : brancher sur `userId` rendait cet usage invisible dès que
	// le client se créait un compte avec le même email, offrant une redemption
	// supplémentaire par code et par personne (fuite `maxUsagePerUser`).
	//
	// Chaque compteur vaut 0 quand l'identité correspondante est absente
	// (l'appelant ne requête que ce qu'il peut résoudre) — le `max` reste donc
	// correct dans les trois configurations (userId seul, email seul, les deux).
	// Sans aucune identité on laisse passer : la vérification aura lieu à la
	// création de la commande, avec l'email de commande.
	if (discount.maxUsagePerUser && usageCounts && (userId || customerEmail)) {
		const { userCount, emailCount } = usageCounts;

		if (Math.max(userCount, emailCount) >= discount.maxUsagePerUser) {
			return {
				eligible: false,
				error: DISCOUNT_ERROR_MESSAGES.USER_MAX_USAGE_REACHED,
			};
		}
	}

	return { eligible: true };
}
