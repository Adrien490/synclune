"use server";

import { ActionState, ActionStatus } from "@/shared/types/server-action";
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
		return {
			status: ActionStatus.SUCCESS,
			message: `Code "${result.discount.code}" appliqué`,
			data: result.discount,
		};
	}

	return {
		status: ActionStatus.ERROR,
		message: result.error || "Code invalide",
	};
}
