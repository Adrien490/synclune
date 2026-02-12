"use server";

import { prisma } from "@/shared/lib/prisma";
import { validateDiscountCodeSchema } from "../schemas/discount.schemas";
import { GET_DISCOUNT_VALIDATION_SELECT, DISCOUNT_ERROR_MESSAGES } from "../constants/discount.constants";
import { calculateDiscountAmount } from "../services/discount-calculation.service";
import { checkDiscountEligibility } from "../services/discount-eligibility.service";
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
		// 1. Valider les paramètres avec messages d'erreur spécifiques
		const validation = validateDiscountCodeSchema.safeParse({
			code,
			subtotal,
			userId,
			customerEmail,
		});

		if (!validation.success) {
			// Identifier quel champ a échoué pour un meilleur diagnostic
			const firstError = validation.error.issues[0];
			const path = firstError?.path[0];

			if (path === "code") {
				return { valid: false, error: "Format de code invalide" };
			}
			if (path === "subtotal") {
				return { valid: false, error: "Erreur de calcul du panier" };
			}
			if (path === "userId") {
				// On continue sans userId plutôt que bloquer
			}
			if (path === "customerEmail") {
				// On continue sans email plutôt que bloquer
			}

			// Si c'est userId ou customerEmail qui a échoué, on réessaie sans
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
				// Continuer avec les données validées (sans userId/email)
				const {
					code: validatedCode,
					subtotal: validatedSubtotal,
				} = retryValidation.data;

				// Rechercher le code promo
				const discount = await prisma.discount.findFirst({
					where: { code: validatedCode, deletedAt: null },
					select: GET_DISCOUNT_VALIDATION_SELECT,
				});

				if (!discount) {
					return { valid: false, error: DISCOUNT_ERROR_MESSAGES.NOT_FOUND };
				}

				// Vérifier l'éligibilité sans userId/email
				const context: DiscountApplicationContext = {
					subtotal: validatedSubtotal,
					userId: undefined,
					customerEmail: undefined,
				};

				const eligibility = await checkDiscountEligibility(discount, context);

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

			return { valid: false, error: "Code invalide" };
		}

		const {
			code: validatedCode,
			subtotal: validatedSubtotal,
			userId: validatedUserId,
			customerEmail: validatedEmail,
		} = validation.data;

		// 2. Rechercher le code promo
		const discount = await prisma.discount.findFirst({
			where: { code: validatedCode, deletedAt: null },
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
	} catch {
		return { valid: false, error: "Erreur lors de la validation du code" };
	}
}
