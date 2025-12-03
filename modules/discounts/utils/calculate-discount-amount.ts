import { DiscountType } from "@/app/generated/prisma";

export type CalculateDiscountParams = {
	type: DiscountType;
	value: number;
	subtotal: number; // En centimes (hors frais de port)
};

/**
 * Item du panier pour le calcul de réduction avec exclusion articles soldés
 */
export type CartItemForDiscount = {
	priceInclTax: number; // Prix unitaire en centimes
	quantity: number;
	compareAtPrice: number | null; // Si non-null, l'article est soldé
};

export type CalculateDiscountWithExclusionParams = {
	type: DiscountType;
	value: number;
	cartItems: CartItemForDiscount[];
	excludeSaleItems: boolean;
};

/**
 * Calcule le montant de la réduction en centimes
 *
 * @param type - Type de réduction (PERCENTAGE ou FIXED_AMOUNT)
 * @param value - Valeur (pourcentage 0-100 ou montant en centimes)
 * @param subtotal - Sous-total du panier en centimes (hors frais de port)
 * @returns Montant de la réduction en centimes
 *
 * @example
 * // Réduction de 20% sur 5000 centimes (50€)
 * calculateDiscountAmount({ type: "PERCENTAGE", value: 20, subtotal: 5000 })
 * // => 1000 (10€)
 *
 * @example
 * // Réduction fixe de 10€ (1000 centimes)
 * calculateDiscountAmount({ type: "FIXED_AMOUNT", value: 1000, subtotal: 5000 })
 * // => 1000 (10€)
 *
 * @example
 * // Réduction fixe supérieure au panier (plafonnée)
 * calculateDiscountAmount({ type: "FIXED_AMOUNT", value: 10000, subtotal: 5000 })
 * // => 5000 (50€) - Ne peut pas dépasser le subtotal
 */
export function calculateDiscountAmount({
	type,
	value,
	subtotal,
}: CalculateDiscountParams): number {
	if (subtotal <= 0) return 0;

	if (type === DiscountType.PERCENTAGE) {
		// Ex: 20% sur 5000 centimes = 1000 centimes
		// Arrondi au centime inférieur pour ne pas sur-réduire
		return Math.floor((subtotal * value) / 100);
	}

	// FIXED_AMOUNT: La valeur est déjà en centimes
	// Ne peut pas être supérieur au subtotal du panier
	return Math.min(value, subtotal);
}

/**
 * Formate la valeur du discount pour affichage
 *
 * @example
 * formatDiscountValue("PERCENTAGE", 20) // => "20%"
 * formatDiscountValue("FIXED_AMOUNT", 1000) // => "10,00 €"
 */
export function formatDiscountValue(type: DiscountType, value: number): string {
	if (type === DiscountType.PERCENTAGE) {
		return `${value}%`;
	}
	return `${(value / 100).toFixed(2).replace(".", ",")} €`;
}

/**
 * Génère le libellé descriptif du discount
 *
 * @example
 * getDiscountLabel("PERCENTAGE", 20) // => "-20%"
 * getDiscountLabel("FIXED_AMOUNT", 1000) // => "-10,00 €"
 */
export function getDiscountLabel(type: DiscountType, value: number): string {
	return `-${formatDiscountValue(type, value)}`;
}

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
	excludeSaleItems: boolean
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
	const { eligibleSubtotal, totalSubtotal } = calculateEligibleSubtotal(
		cartItems,
		excludeSaleItems
	);

	if (eligibleSubtotal <= 0) return 0;

	if (type === DiscountType.PERCENTAGE) {
		// Pourcentage appliqué sur le subtotal éligible uniquement
		return Math.floor((eligibleSubtotal * value) / 100);
	}

	// FIXED_AMOUNT: Montant fixe, plafonné au subtotal éligible
	// Note: Pour un montant fixe, on peut aussi plafonner au total si besoin
	return Math.min(value, eligibleSubtotal);
}
