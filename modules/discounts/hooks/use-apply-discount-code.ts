"use client";

import { useActionState, useTransition } from "react";
import { applyDiscountCode } from "@/modules/discounts/actions/apply-discount-code";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { AppliedDiscount } from "@/modules/discounts/types/discount.types";

interface UseApplyDiscountCodeOptions {
	onSuccess?: (discount: AppliedDiscount) => void;
	onError?: (message: string) => void;
}

/**
 * Hook pour appliquer un code promo pendant le checkout
 *
 * Suit le pattern établi : useActionState + withCallbacks + createToastCallbacks
 *
 * @example
 * ```tsx
 * const { applyCode, isPending } = useApplyDiscountCode({
 *   onSuccess: (discount) => {
 *     setAppliedDiscount(discount);
 *     onDiscountChange?.(discount);
 *   },
 *   onError: () => {
 *     setAppliedDiscount(null);
 *   },
 * });
 *
 * const handleApply = () => {
 *   applyCode(code);
 * };
 * ```
 */
export function useApplyDiscountCode(options?: UseApplyDiscountCodeOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(
			applyDiscountCode,
			createToastCallbacks({
				showSuccessToast: true,
				showErrorToast: true,
				onSuccess: (result) => {
					if (result.data) {
						options?.onSuccess?.(result.data as AppliedDiscount);
					}
				},
				onError: (result) => {
					options?.onError?.(result.message || "Code invalide");
				},
			}),
		),
		undefined,
	);

	/**
	 * Helper pour créer le FormData et appeler l'action.
	 * Gère le trim + uppercase.
	 *
	 * N'envoie QUE le code : `applyDiscountCode` ne lit rien d'autre. Le hook
	 * appendait auparavant `subtotal`, `userId` et `customerEmail`, tous ignorés
	 * côté serveur (sous-total recalculé depuis le panier en DB, identité prise
	 * dans la session) — une signature qui laissait croire à tort que le client
	 * pilotait le montant de la remise et son bénéficiaire.
	 */
	const applyCode = (code: string) => {
		const formData = new FormData();
		formData.append("code", code.trim().toUpperCase());
		startTransition(() => {
			formAction(formData);
		});
	};

	return {
		state,
		action: formAction,
		applyCode,
		isPending: isTransitionPending || isActionPending,
	};
}
