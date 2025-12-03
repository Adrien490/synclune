"use client";

import { adjustSkuStock } from "@/modules/skus/actions/admin/adjust-sku-stock";
import { useAppForm } from "@/shared/components/tanstack-form";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";

interface UseAdjustStockFormOptions {
	skuId: string;
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
			adjustSkuStock,
			createToastCallbacks({
				onSuccess: () => {
					options.onSuccess?.();
				},
			})
		),
		undefined
	);

	const form = useAppForm({
		defaultValues: {
			skuId: options.skuId,
			adjustment: 0,
			reason: "",
		},
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	// Watch des valeurs pour le calcul du nouveau stock
	const adjustment = useStore(form.store, (s) => s.values.adjustment);
	const newStock = options.currentStock + adjustment;
	const isValid = adjustment !== 0 && newStock >= 0;

	const formErrors = useStore(form.store, (formState) => formState.errors);

	return {
		form,
		state,
		action,
		isPending,
		formErrors,
		adjustment,
		newStock,
		isValid,
	};
}
