import type { DiscountValidation, DiscountStatus } from "../types/discount.types";

export type { DiscountStatus } from "../types/discount.types";

// ============================================================================
// DISCOUNT VALIDATION SERVICE
// Pure functions for validating discount status
// ============================================================================

/**
 * Vérifie si un discount est actuellement valide (sans contexte utilisateur)
 * Utilisé pour l'affichage dans l'admin
 *
 * @param discount - Discount à valider
 * @returns true si le discount peut être utilisé
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
 *
 * @param discount - Discount à évaluer
 * @returns Statut du discount
 */
export function getDiscountStatus(discount: DiscountValidation): DiscountStatus {
	if (!discount.isActive) return "inactive";

	if (
		discount.maxUsageCount &&
		discount.usageCount >= discount.maxUsageCount
	) {
		return "exhausted";
	}

	return "active";
}

/**
 * Vérifie si le montant minimum de commande est atteint
 *
 * @param subtotal - Montant du panier en centimes
 * @param minOrderAmount - Montant minimum requis en centimes
 * @returns true si le minimum est atteint ou s'il n'y a pas de minimum
 */
export function isMinOrderAmountMet(
	subtotal: number,
	minOrderAmount: number | null
): boolean {
	if (!minOrderAmount) return true;
	return subtotal >= minOrderAmount;
}

/**
 * Vérifie si la limite d'utilisation globale est atteinte
 *
 * @param usageCount - Nombre d'utilisations actuelles
 * @param maxUsageCount - Limite d'utilisation
 * @returns true si la limite est atteinte
 */
export function isMaxUsageReached(
	usageCount: number,
	maxUsageCount: number | null
): boolean {
	if (!maxUsageCount) return false;
	return usageCount >= maxUsageCount;
}
