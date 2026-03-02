"use server";

import type { ActionState } from "@/shared/types/server-action";
import { success, error, safeFormGet } from "@/shared/lib/actions";
import { handleActionError } from "@/shared/lib/actions/errors";
import { validateDiscountCode } from "./validate-discount-code";

/**
 * Action serveur pour appliquer un code promo pendant le checkout
 *
 * Wrapper autour de validateDiscountCode qui :
 * - Accepte FormData (compatible useActionState)
 * - Retourne ActionState (compatible withCallbacks)
 * - Recupere userId/email depuis la session serveur (jamais le client)
 *
 * Note: Rate limiting is handled by validateDiscountCode internally.
 */
export async function applyDiscountCode(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const code = safeFormGet(formData, "code");
		const subtotal = Number(formData.get("subtotal"));

		if (!code) {
			return error("Code promo requis");
		}

		// validateDiscountCode reads userId from session internally
		const result = await validateDiscountCode(code, subtotal);

		if (result.valid && result.discount) {
			return success(`Code "${result.discount.code}" appliqué`, result.discount);
		}

		return error(result.error ?? "Code invalide");
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'application du code promo");
	}
}
