"use client";

import { useActionState, useTransition } from "react";
import { duplicateVariant } from "@/modules/variants/actions/duplicate-variant";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

/**
 * Charge utile de succès de `duplicateVariant` — l'id de la COPIE.
 *
 * ⚠️ Ce garde doit rester aligné sur le `success(…, { variantId })` de
 * `actions/duplicate-variant.ts`. Il a longtemps exigé `{ id, variant, productId,
 * productSlug }`, une forme que l'action n'a jamais renvoyée : le garde ne passait
 * donc jamais, `onSuccess` n'était jamais appelé et, avec `showSuccessToast: false`,
 * dupliquer une variante ne produisait AUCUN retour visible. Le test unitaire
 * fabriquait la forme attendue au lieu de la lire de l'action — il restait vert.
 */
export interface DuplicateVariantSuccessData {
	variantId: string;
}

const isDuplicateVariantSuccessData = (value: unknown): value is DuplicateVariantSuccessData =>
	value !== null &&
	typeof value === "object" &&
	typeof (value as DuplicateVariantSuccessData).variantId === "string";

interface UseDuplicateVariantOptions {
	onSuccess?: (message: string, data: DuplicateVariantSuccessData) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer un VARIANT.
 */
export function useDuplicateVariant(options?: UseDuplicateVariantOptions) {
	const [isPending, startTransition] = useTransition();

	const [, formAction] = useActionState(
		withCallbacks(
			duplicateVariant,
			createToastCallbacks({
				loadingMessage: "Duplication en cours…",
				showSuccessToast: false,
				onSuccess: (result) => {
					if (typeof result.message === "string" && isDuplicateVariantSuccessData(result.data)) {
						options?.onSuccess?.(result.message, result.data);
					}
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

	const duplicate = (variantId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("variantId", variantId);
			formAction(formData);
		});
	};

	return {
		duplicate,
		isPending,
	};
}
