"use client";

import { adjustVariantStock } from "@/modules/variants/actions/adjust-variant-stock";
import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";

interface UseAdjustStockFormOptions {
	variantId: string;
	currentStock: number;
	onSuccess?: () => void;
}

/**
 * Hook pour le formulaire d'ajustement de stock
 * Utilise TanStack Form avec Next.js App Router
 */
export function useAdjustStockForm(options: UseAdjustStockFormOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			adjustVariantStock,
			createToastCallbacks({
				loadingMessage: "Ajustement du stock…",
				onSuccess: () => {
					options.onSuccess?.();
				},
			}),
		),
		undefined,
	);

	const form = useAppForm({
		defaultValues: {
			variantId: options.variantId,
			adjustment: 0,
		},
		transform: useTransform((baseForm) => mergeForm(baseForm, (state as unknown) ?? {}), [state]),
	});

	// Watch des valeurs pour le calcul du nouveau stock
	const adjustment = useStore(form.store, (s) => s.values.adjustment);
	const newStock = options.currentStock + adjustment;
	const isValid = adjustment !== 0 && newStock >= 0;

	return {
		form,
		state,
		action,
		isPending,
		adjustment,
		newStock,
		isValid,
	};
}
