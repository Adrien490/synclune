"use server";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { writeCartCookie } from "@/modules/cart/lib/cart-cookie";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { readCartWithSkus } from "@/modules/cart/services/read-cart-with-skus.service";
import { assertStoreOpen } from "@/modules/store-settings/services/store-closure-guard";
import { applyCartDiscountSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";
import { GET_DISCOUNT_VALIDATION_SELECT } from "@/modules/discounts/constants/discount.constants";
import { checkDiscountEligibility } from "@/modules/discounts/services/discount-eligibility.service";
import { calculateDiscountWithExclusion } from "@/modules/discounts/services/discount-calculation.service";
import { getDiscountUsageCounts } from "@/modules/discounts/data/get-discount-usage-counts";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { formatEuro } from "@/shared/utils/format-euro";
import type { CartItemForDiscount } from "@/modules/discounts/types/discount.types";

/**
 * Server Action pour appliquer un code promo au panier (pre-checkout)
 *
 * Persiste le CODE dans le cookie `cart` — jamais le montant. [[CART-DISCOUNT-001]]
 * le montant est re-dérivé à chaque lecture par `getCart()`, de sorte qu'il suive
 * toujours les articles réels (une remise figée devenait fausse dès la première
 * mutation du panier). Le montant retourné ici ne sert qu'au toast de confirmation.
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
		// 1. Rate limiting
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.DISCOUNT);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}

		// Defense-in-depth : bloquer l'application de discount quand la boutique est fermée.
		const storeCheck = await assertStoreOpen();
		if (storeCheck) return error(storeCheck.message);

		// 2. Validation input
		const validated = validateInput(applyCartDiscountSchema, {
			code: safeFormGet(formData, "code"),
		});
		if ("error" in validated) return validated.error;
		const { code } = validated.data;

		// 3. Panier + subtotal SERVEUR (le cookie ne porte que des quantités ; les
		// prix du calcul sont relus en base, jamais le témoin `priceAtAdd`)
		const { cookie, items } = await readCartWithSkus();

		const eligibleItems = items.filter(
			(item) =>
				!item.sku.deletedAt && !item.sku.product.deletedAt && item.sku.product.status === "PUBLIC",
		);

		if (eligibleItems.length === 0) {
			return error(CART_ERROR_MESSAGES.CART_EMPTY);
		}

		const cartItems: CartItemForDiscount[] = eligibleItems.map((item) => ({
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

		// 5. Check eligibility (email de commande = seule identité de la limite par personne)
		const session = await getSession();
		const customerEmail = session?.user.email ?? undefined;

		const usageCounts = discount.maxUsagePerUser
			? await getDiscountUsageCounts({
					discountId: discount.id,
					customerEmail,
				})
			: undefined;

		const eligibility = checkDiscountEligibility(
			discount,
			{ subtotal, customerEmail },
			usageCounts,
		);

		if (!eligibility.eligible) {
			return error(eligibility.error ?? CART_ERROR_MESSAGES.DISCOUNT_CODE_INVALID);
		}

		// 6. Calculate discount amount (exclude sale items) — affichage du toast
		const discountAmount = calculateDiscountWithExclusion({
			type: discount.type,
			value: discount.value,
			cartItems,
			excludeSaleItems: true,
		});

		// 7. Persist le code dans le cookie
		await writeCartCookie({ ...cookie, discountCode: discount.code });

		return success(`Code "${discount.code}" appliqué (-${formatEuro(discountAmount)})`, {
			code: discount.code,
			discountAmount,
			type: discount.type,
			value: discount.value,
		});
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'application du code promo");
	}
}
