"use server";

import type { ActionState } from "@/shared/types/server-action";
import { success, error } from "@/shared/lib/actions";
import { enforceRateLimit } from "@/shared/lib/actions/rate-limit";
import { getSession } from "@/modules/auth/lib/get-current-session";
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
	// Rate limiting based on IP
	const headersList = await headers();
	const ip = await getClientIp(headersList);
	if (ip) {
		const rateCheck = await enforceRateLimit(ip, PAYMENT_LIMITS.VALIDATE_DISCOUNT);
		if ("error" in rateCheck) return rateCheck.error;
	}

	const code = formData.get("code") as string;
	const subtotal = Number(formData.get("subtotal"));

	// Get userId and email from server-side session, never from client
	const session = await getSession();
	const userId = session?.user?.id;
	const customerEmail = session?.user?.email || undefined;

	const result = await validateDiscountCode(
		code,
		subtotal,
		userId,
		customerEmail
	);

	if (result.valid && result.discount) {
		return success(`Code "${result.discount.code}" appliqué`, result.discount);
	}

	return error(result.error || "Code invalide");
}
