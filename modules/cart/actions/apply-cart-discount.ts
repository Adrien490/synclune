"use server";

import { updateTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { applyCartDiscountSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";
import { GET_DISCOUNT_VALIDATION_SELECT } from "@/modules/discounts/constants/discount.constants";
import { checkDiscountEligibility } from "@/modules/discounts/services/discount-eligibility.service";
import { calculateDiscountWithExclusion } from "@/modules/discounts/services/discount-calculation.service";
import { getDiscountUsageCounts } from "@/modules/discounts/data/get-discount-usage-counts";
import { getSession } from "@/modules/auth/lib/get-current-session";
import type { CartItemForDiscount } from "@/modules/discounts/types/discount.types";

/**
 * Server Action pour appliquer un code promo au panier (pre-checkout)
 *
 * Persiste le code sur Cart.appliedDiscountCode + snapshot du montant calculé
 * sur Cart.discountAmountCache. Le montant sera recalculé à la création de la commande.
 *
 * Difference vs `modules/discounts/actions/apply-discount-code` : cette variante
 * PERSISTE le code sur le panier pour etre visible avant le checkout Stripe.
 *
 * Rate limiting configure via CART_LIMITS.DISCOUNT
 */
export async function applyCartDiscount(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting + contexte
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.DISCOUNT);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		if (!userId && !sessionId) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		// 2. Validation input
		const rawData = { code: safeFormGet(formData, "code") };
		const validated = validateInput(applyCartDiscountSchema, rawData);
		if ("error" in validated) return validated.error;
		const { code } = validated.data;

		// 3. Recuperer le panier + subtotal serveur (jamais trust client)
		const cart = await prisma.cart.findFirst({
			where: userId ? { userId } : { sessionId: sessionId! },
			select: {
				id: true,
				items: {
					where: {
						sku: { deletedAt: null, product: { deletedAt: null, status: "PUBLIC" } },
					},
					select: {
						quantity: true,
						sku: {
							select: { priceInclTax: true, compareAtPrice: true },
						},
					},
				},
			},
		});

		if (!cart || cart.items.length === 0) {
			return error(CART_ERROR_MESSAGES.CART_EMPTY);
		}

		const cartItems: CartItemForDiscount[] = cart.items.map((item) => ({
			priceInclTax: item.sku.priceInclTax,
			quantity: item.quantity,
			compareAtPrice: item.sku.compareAtPrice,
		}));
		const subtotal = cartItems.reduce((sum, it) => sum + it.priceInclTax * it.quantity, 0);

		// 4. Lookup discount
		const discount = await prisma.discount.findUnique({
			where: { code, ...notDeleted },
			select: GET_DISCOUNT_VALIDATION_SELECT,
		});

		if (!discount) {
			return error(CART_ERROR_MESSAGES.DISCOUNT_CODE_INVALID);
		}

		// 5. Check eligibility (user + email for guest limits)
		const session = await getSession();
		const customerEmail = session?.user.email ?? undefined;

		const usageCounts = discount.maxUsagePerUser
			? await getDiscountUsageCounts({
					discountId: discount.id,
					userId,
					customerEmail,
				})
			: undefined;

		const eligibility = checkDiscountEligibility(
			discount,
			{ subtotal, userId, customerEmail },
			usageCounts,
		);

		if (!eligibility.eligible) {
			return error(eligibility.error ?? CART_ERROR_MESSAGES.DISCOUNT_CODE_INVALID);
		}

		// 6. Calculate discount amount (exclude sale items)
		const discountAmount = calculateDiscountWithExclusion({
			type: discount.type,
			value: discount.value,
			cartItems,
			excludeSaleItems: true,
		});

		// 7. Persist on cart (snapshot code + amount for UI display pre-checkout)
		await prisma.cart.update({
			where: { id: cart.id },
			data: {
				appliedDiscountCode: discount.code,
				discountAmountCache: discountAmount,
				updatedAt: new Date(),
			},
		});

		// 8. Invalidate cache
		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		const formattedAmount = (discountAmount / 100).toFixed(2).replace(".", ",");
		return success(`Code "${discount.code}" appliqué (-${formattedAmount} €)`, {
			code: discount.code,
			discountAmount,
			type: discount.type,
			value: discount.value,
		});
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'application du code promo");
	}
}
