"use client";

import { useActionState, useTransition } from "react";
import { updateVariantPrice } from "@/modules/variants/actions/update-variant-price";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseUpdateVariantPriceOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour modifier rapidement le prix d'un VARIANT
 * Note: Les prix sont en EUROS (convertis en centimes côté serveur)
 */
export function useUpdateVariantPrice(options?: UseUpdateVariantPriceOptions) {
	const [isPending, startTransition] = useTransition();

	// `state` exposé (et non ignoré) : sans lui, un refus du schéma serveur était
	// muet côté UI — `createToastCallbacks` retire les VALIDATION_ERROR du toast en
	// supposant un affichage inline.
	const [state, formAction] = useActionState(
		withCallbacks(
			updateVariantPrice,
			createToastCallbacks({
				loadingMessage: "Mise à jour du prix…",
				onSuccess: () => {
					options?.onSuccess?.();
				},
				onError: (result) => {
					if (result.message) {
						options?.onError?.(result.message);
					}
				},
			}),
		),
		undefined,
	);

	/**
	 * Met à jour le prix d'un VARIANT
	 * @param variantId - ID du VARIANT
	 * @param _variantName - Nom du VARIANT (pour le message de confirmation)
	 * @param priceEuros - Prix en euros (ex: 30.00)
	 * @param compareAtPriceEuros - Prix barré optionnel en euros
	 */
	const updatePrice = (
		variantId: string,
		_variantName: string,
		priceEuros: number,
		compareAtPriceEuros?: number | null,
	) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("variantId", variantId);
			formData.append("priceEuros", String(priceEuros));
			if (compareAtPriceEuros != null) {
				formData.append("compareAtPriceEuros", String(compareAtPriceEuros));
			}
			formAction(formData);
		});
	};

	return {
		updatePrice,
		isPending,
		state,
	};
}
