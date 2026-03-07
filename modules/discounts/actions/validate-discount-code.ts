"use server";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { getClientIp } from "@/shared/lib/rate-limit";
import { enforceRateLimit } from "@/shared/lib/actions/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { ajDiscountValidation } from "@/shared/lib/arcjet";
import { headers } from "next/headers";
import { validateDiscountCodeSchema } from "../schemas/discount.schemas";
import {
	GET_DISCOUNT_VALIDATION_SELECT,
	DISCOUNT_ERROR_MESSAGES,
} from "../constants/discount.constants";
import { calculateDiscountWithExclusion } from "../services/discount-calculation.service";
import { checkDiscountEligibility } from "../services/discount-eligibility.service";
import { getDiscountUsageCounts } from "../data/get-discount-usage-counts";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getCart } from "@/modules/cart/data/get-cart";
import type {
	ValidateDiscountCodeReturn,
	DiscountApplicationContext,
	CartItemForDiscount,
} from "../types/discount.types";

/**
 * Computes the subtotal and cart items for discount from the server-side cart.
 * Returns null if the cart is empty or not found.
 */
function getCartDiscountData(cart: NonNullable<Awaited<ReturnType<typeof getCart>>>) {
	const cartItems: CartItemForDiscount[] = [];
	let subtotal = 0;

	for (const item of cart.items) {
		const itemTotal = item.sku.priceInclTax * item.quantity;
		subtotal += itemTotal;
		cartItems.push({
			priceInclTax: item.sku.priceInclTax,
			quantity: item.quantity,
			compareAtPrice: item.sku.compareAtPrice,
		});
	}

	return { subtotal, cartItems };
}

/**
 * Looks up the discount, checks eligibility, and calculates the amount.
 * Uses server-side cart data for subtotal and sale item exclusion.
 */
async function lookupAndValidate(
	validatedCode: string,
	cartData: { subtotal: number; cartItems: CartItemForDiscount[] },
	userId?: string,
	customerEmail?: string,
): Promise<ValidateDiscountCodeReturn> {
	const discount = await prisma.discount.findUnique({
		where: { code: validatedCode, ...notDeleted },
		select: GET_DISCOUNT_VALIDATION_SELECT,
	});

	if (!discount) {
		return { valid: false, error: DISCOUNT_ERROR_MESSAGES.NOT_FOUND };
	}

	const context: DiscountApplicationContext = {
		subtotal: cartData.subtotal,
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

	// Use calculateDiscountWithExclusion for accurate preview matching order creation
	const discountAmount = calculateDiscountWithExclusion({
		type: discount.type,
		value: discount.value,
		cartItems: cartData.cartItems,
		excludeSaleItems: true,
	});

	return {
		valid: true,
		discount: {
			id: discount.id,
			code: discount.code,
			type: discount.type,
			value: discount.value,
			discountAmount,
			excludeSaleItems: true,
		},
	};
}

/**
 * Valide un code promo et calcule le montant de la reduction
 *
 * Utilise pendant le checkout pour :
 * 1. Verifier que le code existe et est valide
 * 2. Verifier toutes les conditions d'eligibilite
 * 3. Calculer le montant de la reduction
 *
 * Security:
 * - userId is always read from the server-side session (never trusted from client)
 * - subtotal is computed server-side from the cart (never trusted from client)
 * - customerEmail can be provided for guest checkout (validated by Zod)
 *
 * @param code - Le code promo saisi par l'utilisateur
 * @param _subtotal - IGNORED: subtotal is now computed server-side from the cart
 * @param customerEmail - L'email du client pour guest checkout (optionnel)
 *
 * @returns ValidateDiscountCodeReturn avec le resultat de la validation
 */
export async function validateDiscountCode(
	code: string,
	_subtotal: number,
	customerEmail?: string,
): Promise<ValidateDiscountCodeReturn> {
	try {
		// Arcjet: distributed rate limiting + shield + bot detection
		const headersList = await headers();
		const arcjetRequest = new Request("http://localhost/discount/validate", {
			method: "POST",
			headers: headersList,
		});
		const arcjetDecision = await ajDiscountValidation.protect(arcjetRequest, {
			requested: 1,
		});
		if (arcjetDecision.isDenied()) {
			return { valid: false, error: "Trop de tentatives. Veuillez reessayer plus tard." };
		}

		// In-memory rate limiting (complementary, for burst protection)
		const ip = (await getClientIp(headersList)) ?? "unknown";
		const rateCheck = await enforceRateLimit(`ip:${ip}`, PAYMENT_LIMITS.VALIDATE_DISCOUNT, ip);
		if ("error" in rateCheck)
			return { valid: false, error: "Trop de tentatives. Veuillez reessayer plus tard." };

		// Read userId from session server-side (never trust client-provided value)
		const session = await getSession();
		const userId = session?.user.id;
		const sessionEmail = session?.user.email ?? undefined;

		// Use session email if available, fallback to provided guest email
		const effectiveEmail = sessionEmail ?? customerEmail;

		// Fetch cart server-side to compute subtotal (never trust client-provided value)
		const cart = await getCart();
		if (!cart || cart.items.length === 0) {
			return { valid: false, error: "Votre panier est vide" };
		}

		const cartData = getCartDiscountData(cart);

		// 1. Valider les parametres avec messages d'erreur specifiques
		const validation = validateDiscountCodeSchema.safeParse({
			code,
			subtotal: cartData.subtotal,
			userId,
			customerEmail: effectiveEmail,
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

			// If customerEmail validation failed, reject immediately (needed for maxUsagePerUser)
			if (path === "customerEmail") {
				return { valid: false, error: "Adresse email invalide" };
			}

			// If userId validation failed, retry without it but keep customerEmail for maxUsagePerUser
			if (path === "userId") {
				const retryValidation = validateDiscountCodeSchema.safeParse({
					code,
					subtotal: cartData.subtotal,
					userId: undefined,
					customerEmail: effectiveEmail,
				});
				if (!retryValidation.success) {
					return { valid: false, error: "Code invalide" };
				}
				return lookupAndValidate(
					retryValidation.data.code,
					cartData,
					undefined,
					retryValidation.data.customerEmail,
				);
			}

			return { valid: false, error: "Code invalide" };
		}

		// 2. Lookup, check eligibility, and calculate discount
		return lookupAndValidate(
			validation.data.code,
			cartData,
			validation.data.userId,
			validation.data.customerEmail,
		);
	} catch {
		return { valid: false, error: "Erreur lors de la validation du code" };
	}
}
