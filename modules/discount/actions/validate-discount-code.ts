"use server";

import { prisma } from "@/shared/lib/prisma";
import { validateDiscountCodeSchema } from "../schemas/discount.schemas";
import { GET_DISCOUNT_VALIDATION_SELECT, DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import { calculateDiscountAmount } from "../utils/calculate-discount-amount";
import { checkDiscountEligibility } from "../utils/check-discount-eligibility";
import type { ValidateDiscountCodeReturn, DiscountApplicationContext } from "../types/discount.types";

/**
 * Valide un code promo et calcule le montant de la réduction
 *
 * Utilisé pendant le checkout pour :
 * 1. Vérifier que le code existe et est valide
 * 2. Vérifier toutes les conditions d'éligibilité
 * 3. Calculer le montant de la réduction
 *
 * @param code - Le code promo saisi par l'utilisateur
 * @param subtotal - Le sous-total du panier en centimes (hors frais de port)
 * @param userId - L'ID de l'utilisateur connecté (optionnel)
 * @param customerEmail - L'email du client pour guest checkout (optionnel)
 *
 * @returns ValidateDiscountCodeReturn avec le résultat de la validation
 */
export async function validateDiscountCode(
	code: string,
	subtotal: number,
	userId?: string,
	customerEmail?: string
): Promise<ValidateDiscountCodeReturn> {
	try {
		// 1. Valider les paramètres
		const validation = validateDiscountCodeSchema.safeParse({
			code,
			subtotal,
			userId,
			customerEmail,
		});

		if (!validation.success) {
			return { valid: false, error: "Code invalide" };
		}

		const {
			code: validatedCode,
			subtotal: validatedSubtotal,
			userId: validatedUserId,
			customerEmail: validatedEmail,
		} = validation.data;

		// 2. Rechercher le code promo
		const discount = await prisma.discount.findUnique({
			where: { code: validatedCode },
			select: GET_DISCOUNT_VALIDATION_SELECT,
		});

		if (!discount) {
			return { valid: false, error: DISCOUNT_ERROR_MESSAGES.NOT_FOUND };
		}

		// 3. Vérifier l'éligibilité
		const context: DiscountApplicationContext = {
			subtotal: validatedSubtotal,
			userId: validatedUserId,
			customerEmail: validatedEmail,
		};

		const eligibility = await checkDiscountEligibility(discount, context);

		if (!eligibility.eligible) {
			return { valid: false, error: eligibility.error };
		}

		// 4. Calculer le montant de la réduction
		const discountAmount = calculateDiscountAmount({
			type: discount.type,
			value: discount.value,
			subtotal: validatedSubtotal,
		});

		return {
			valid: true,
			discount: {
				id: discount.id,
				code: discount.code,
				type: discount.type,
				value: discount.value,
				discountAmount,
			},
		};
	} catch (error) {
		console.error("[VALIDATE_DISCOUNT_CODE]", error);
		return { valid: false, error: "Erreur lors de la validation du code" };
	}
}
