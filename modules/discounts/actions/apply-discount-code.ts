"use server";

import type { ActionState } from "@/shared/types/server-action";
import { success, error } from "@/shared/lib/actions";
import { validateDiscountCode } from "./validate-discount-code";

/**
 * Action serveur pour appliquer un code promo pendant le checkout
 *
 * Wrapper autour de validateDiscountCode qui :
 * - Accepte FormData (compatible useActionState)
 * - Retourne ActionState (compatible withCallbacks)
 *
 * @example
 * ```tsx
 * const { applyCode, isPending } = useApplyDiscountCode({
 *   onSuccess: (discount) => setAppliedDiscount(discount),
 * });
 * ```
 */
export async function applyDiscountCode(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	const code = formData.get("code") as string;
	const subtotal = Number(formData.get("subtotal"));
	const userId = (formData.get("userId") as string) || undefined;
	const customerEmail = (formData.get("customerEmail") as string) || undefined;

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
