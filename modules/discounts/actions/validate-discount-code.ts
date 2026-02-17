"use server";

import { prisma } from "@/shared/lib/prisma";
import { validateDiscountCodeSchema } from "../schemas/discount.schemas";
import { GET_DISCOUNT_VALIDATION_SELECT, DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import { calculateDiscountAmount } from "../services/discount-calculation.service";
import { checkDiscountEligibility } from "../services/discount-eligibility.service";
import { getDiscountUsageCounts } from "../data/get-discount-usage-counts";
import type { ValidateDiscountCodeReturn, DiscountApplicationContext } from "../types/discount.types";

/**
 * Looks up the discount, checks eligibility, and calculates the amount.
 * Shared by both the main path and the userId/email retry path.
 */
async function lookupAndValidate(
	validatedCode: string,
	validatedSubtotal: number,
	userId?: string,
	customerEmail?: string
): Promise<ValidateDiscountCodeReturn> {
	const discount = await prisma.discount.findFirst({
		where: { code: validatedCode, deletedAt: null },
		select: GET_DISCOUNT_VALIDATION_SELECT,
	});

	if (!discount) {
		return { valid: false, error: DISCOUNT_ERROR_MESSAGES.NOT_FOUND };
	}

	const context: DiscountApplicationContext = {
		subtotal: validatedSubtotal,
		userId,
		customerEmail,
	};

	// Fetch usage counts for per-user limit check (I/O done here, not in the service)
	const usageCounts = discount.maxUsagePerUser
		? await getDiscountUsageCounts({
				discountId: discount.id,
				userId,
				customerEmail,
			})
		: undefined;

	const eligibility = checkDiscountEligibility(discount, context, usageCounts);

	if (!eligibility.eligible) {
		return { valid: false, error: eligibility.error };
	}

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
}

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
		// 1. Valider les paramètres avec messages d'erreur spécifiques
		const validation = validateDiscountCodeSchema.safeParse({
			code,
			subtotal,
			userId,
			customerEmail,
		});

		if (!validation.success) {
			const firstError = validation.error.issues[0];
			const path = firstError?.path[0];

			if (path === "code") {
				return { valid: false, error: "Format de code invalide" };
			}
			if (path === "subtotal") {
				return { valid: false, error: "Erreur de calcul du panier" };
			}

			// If userId or customerEmail validation failed, retry without them
			if (path === "userId" || path === "customerEmail") {
				const retryValidation = validateDiscountCodeSchema.safeParse({
					code,
					subtotal,
					userId: undefined,
					customerEmail: undefined,
				});
				if (!retryValidation.success) {
					return { valid: false, error: "Code invalide" };
				}
				return lookupAndValidate(
					retryValidation.data.code,
					retryValidation.data.subtotal
				);
			}

			return { valid: false, error: "Code invalide" };
		}

		// 2. Lookup, check eligibility, and calculate discount
		return lookupAndValidate(
			validation.data.code,
			validation.data.subtotal,
			validation.data.userId,
			validation.data.customerEmail
		);
	} catch {
		return { valid: false, error: "Erreur lors de la validation du code" };
	}
}
