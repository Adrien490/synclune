"use server";

import * as Sentry from "@sentry/nextjs";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getClientIp } from "@/shared/lib/rate-limit";
import { enforceRateLimit } from "@/shared/lib/actions/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
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
import { requireActiveAccountIfAuthenticated } from "@/modules/auth/lib/require-auth";
import { getCart } from "@/modules/cart/data/get-cart";
import { normalizeEmail } from "@/shared/utils/normalize-email";
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
		customerEmail,
	};

	// Fetch usage count for the per-person limit check (I/O done here, not in the service)
	const usageCounts = discount.maxUsagePerUser
		? await getDiscountUsageCounts({
				discountId: discount.id,
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
 * - subtotal is computed server-side from the cart (never trusted from client)
 * - customerEmail can be provided for guest checkout (validated by Zod) ; the
 *   session email wins when a session exists (admin buying on her own shop)
 *
 * @param code - Le code promo saisi par l'utilisateur
 * @param customerEmail - L'email du client pour guest checkout (optionnel)
 *
 * @returns ValidateDiscountCodeReturn avec le resultat de la validation
 */
export async function validateDiscountCode(
	code: string,
	customerEmail?: string,
): Promise<ValidateDiscountCodeReturn> {
	try {
		// In-memory rate limiting.
		// Clé par IP **et** par utilisateur : une clé IP seule laissait un compte
		// authentifié énumérer l'espace des codes (`[A-Z0-9-]{3,30}`) en changeant
		// d'IP, et inversement plafonnait tous les clients d'un même NAT ensemble.
		const headersList = await headers();
		const ip = (await getClientIp(headersList)) ?? "unknown";
		const sessionForLimit = await getSession();
		const rateLimitKey = sessionForLimit?.user.id ? `user:${sessionForLimit.user.id}` : `ip:${ip}`;
		const rateCheck = await enforceRateLimit(rateLimitKey, PAYMENT_LIMITS.VALIDATE_DISCOUNT, ip);
		if ("error" in rateCheck)
			return { valid: false, error: "Trop de tentatives. Veuillez réessayer plus tard." };

		// AUDIT-BIZ-001 — décision explicite : PAS de `assertStoreOpen()` ici,
		// contrairement à `applyCartDiscount` / `addToCart` / `confirmCheckout`.
		// Cette action est en LECTURE SEULE (aucune mutation panier ni commande) : elle
		// répond « ce code est-il valide et combien il vaut ». La bloquer pendant une
		// fermeture n'empêcherait aucun achat (le gate est déjà sur toutes les
		// mutations) et dégraderait la validation du code saisi dans la cart-sheet.
		// Ne PAS l'ajouter sans raison nouvelle.
		//
		// AUTHZ-1 : un invité passe ; une session dont le compte n'est pas ACTIVE
		// (suspendu/INACTIVE) est rejetée (money-neutral, rejet direct).
		const accountGate = await requireActiveAccountIfAuthenticated();
		if ("error" in accountGate) {
			return { valid: false, error: accountGate.error.message };
		}

		// Session email wins over the client-provided guest email (never trusted blindly)
		const session = await getSession();
		const sessionEmail = session?.user.email ?? undefined;

		// Use session email if available, fallback to provided guest email.
		// Normalize (lowercase + trim) to align with confirm-checkout +
		// order-creation, preventing trivial guest bypass of maxUsagePerUser
		// via casing/whitespace (cf [[CHECKOUT-AUDIT-003]]).
		const rawEffectiveEmail = sessionEmail ?? customerEmail;
		const effectiveEmail = rawEffectiveEmail ? normalizeEmail(rawEffectiveEmail) : undefined;

		// Fetch cart server-side to compute subtotal (never trust client-provided value)
		const cart = await getCart();
		if (cart.items.length === 0) {
			return { valid: false, error: "Votre panier est vide" };
		}

		const cartData = getCartDiscountData(cart);

		// 1. Valider les parametres avec messages d'erreur specifiques
		const validation = validateDiscountCodeSchema.safeParse({
			code,
			subtotal: cartData.subtotal,
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

			return { valid: false, error: "Code invalide" };
		}

		// 2. Lookup, check eligibility, and calculate discount
		return lookupAndValidate(validation.data.code, cartData, validation.data.customerEmail);
	} catch (e) {
		Sentry.captureException(e, {
			tags: { module: "discounts", action: "validateDiscountCode" },
			contexts: {
				discount: {
					codeLength: typeof code === "string" ? code.length : 0,
				},
			},
		});
		logger.error("validateDiscountCode failed", e, { service: "validateDiscountCode" });
		return { valid: false, error: "Erreur lors de la validation du code" };
	}
}
