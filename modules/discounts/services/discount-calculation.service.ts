import { DiscountType } from "@/app/generated/prisma/client";
import type {
	CalculateDiscountWithExclusionParams,
	CartItemForDiscount,
} from "../types/discount.types";

export type { CartItemForDiscount } from "../types/discount.types";

/**
 * Calcule le sous-total éligible à la réduction
 * Exclut les articles soldés (avec compareAtPrice) si demandé
 *
 * @param cartItems - Articles du panier avec info de solde
 * @param excludeSaleItems - Si true, exclut les articles avec compareAtPrice
 * @returns Sous-total éligible en centimes
 */
export function calculateEligibleSubtotal(
	cartItems: CartItemForDiscount[],
	excludeSaleItems: boolean,
): { eligibleSubtotal: number; totalSubtotal: number } {
	let eligibleSubtotal = 0;
	let totalSubtotal = 0;

	for (const item of cartItems) {
		const itemTotal = item.priceInclTax * item.quantity;
		totalSubtotal += itemTotal;

		// Si excludeSaleItems est true ET l'article est soldé, on l'exclut du calcul
		const isSaleItem = item.compareAtPrice !== null && item.compareAtPrice > item.priceInclTax;
		if (excludeSaleItems && isSaleItem) {
			continue;
		}

		eligibleSubtotal += itemTotal;
	}

	return { eligibleSubtotal, totalSubtotal };
}

/**
 * Calcule le montant de la réduction avec gestion des articles soldés
 *
 * @param type - Type de réduction (PERCENTAGE ou FIXED_AMOUNT)
 * @param value - Valeur (pourcentage 0-100 ou montant en centimes)
 * @param cartItems - Articles du panier
 * @param excludeSaleItems - Si true, la réduction ne s'applique pas aux articles soldés
 * @returns Montant de la réduction en centimes
 *
 * @example
 * // Panier: Bague 50€ (soldée de 70€) + Collier 30€ (plein tarif)
 * // Code -20% avec exclusion des soldes
 * calculateDiscountWithExclusion({
 *   type: "PERCENTAGE",
 *   value: 20,
 *   cartItems: [
 *     { priceInclTax: 5000, quantity: 1, compareAtPrice: 7000 }, // soldé
 *     { priceInclTax: 3000, quantity: 1, compareAtPrice: null }, // plein tarif
 *   ],
 *   excludeSaleItems: true
 * })
 * // => 600 (6€) - 20% de 30€ seulement, la bague soldée est exclue
 */
export function calculateDiscountWithExclusion({
	type,
	value,
	cartItems,
	excludeSaleItems,
}: CalculateDiscountWithExclusionParams): number {
	const { eligibleSubtotal } = calculateEligibleSubtotal(cartItems, excludeSaleItems);

	if (eligibleSubtotal <= 0) return 0;

	if (type === DiscountType.PERCENTAGE) {
		// Pourcentage appliqué sur le subtotal éligible uniquement
		return Math.floor((eligibleSubtotal * value) / 100);
	}

	// FIXED_AMOUNT: Montant fixe, plafonné au subtotal éligible
	// Note: Pour un montant fixe, on peut aussi plafonner au total si besoin
	return Math.min(value, eligibleSubtotal);
}
