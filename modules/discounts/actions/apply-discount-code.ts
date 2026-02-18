"use server";

import type { ActionState } from "@/shared/types/server-action";
import { success, error } from "@/shared/lib/actions";
import { enforceRateLimit } from "@/shared/lib/actions/rate-limit";
import { getClientIp } from "@/shared/lib/rate-limit";
import { PAYMENT_LIMITS } from "@/shared/lib/rate-limit-config";
import { headers } from "next/headers";
import { validateDiscountCode } from "./validate-discount-code";

/**
 * Action serveur pour appliquer un code promo pendant le checkout
 *
 * Wrapper autour de validateDiscountCode qui :
 * - Accepte FormData (compatible useActionState)
 * - Retourne ActionState (compatible withCallbacks)
 * - Recupere userId/email depuis la session serveur (jamais le client)
 * - Applique le rate limiting
 */
export async function applyDiscountCode(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	// Rate limiting based on IP (fallback to "unknown" to prevent bypass)
	const headersList = await headers();
	const ip = (await getClientIp(headersList)) || "unknown";
	const rateCheck = await enforceRateLimit(`ip:${ip}`, PAYMENT_LIMITS.VALIDATE_DISCOUNT, ip);
	if ("error" in rateCheck) return rateCheck.error;

	const code = formData.get("code") as string;
	const subtotal = Number(formData.get("subtotal"));

	// validateDiscountCode reads userId from session internally
	const result = await validateDiscountCode(code, subtotal);

	if (result.valid && result.discount) {
		return success(`Code "${result.discount.code}" appliqué`, result.discount);
	}

	return error(result.error || "Code invalide");
}
