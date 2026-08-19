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
 * Hook admin pour modifier l'override de prix d'un VARIANT.
 *
 * Le prix est en EUROS (converti en centimes côté serveur). `null` = retirer
 * l'override : la variante retombe sur le prix du produit — c'est la sémantique
 * de `updateVariantPriceSchema` (champ vide), pas un cas d'erreur.
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
	 * @param priceEuros - Prix en euros (ex: 30) ou `null` pour retirer l'override.
	 */
	const updatePrice = (variantId: string, priceEuros: number | null) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("variantId", variantId);
			// Chaîne vide = retrait de l'override (cf. `optionalPriceEurosSchema`).
			formData.append("priceEuros", priceEuros === null ? "" : String(priceEuros));
			formAction(formData);
		});
	};

	return {
		updatePrice,
		isPending,
		state,
	};
}
