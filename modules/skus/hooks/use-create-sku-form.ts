"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { extractServerErrors } from "@/shared/utils/extract-server-errors";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { createProductSku } from "@/modules/skus/actions/create-sku";
import { createProductSkuFormOpts } from "@/modules/skus/constants/create-sku-form-options";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

interface UseCreateProductSkuFormOptions {
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
	onValidationError?: (message: string) => void;
}

const getMessage = (result: ActionState): string | undefined =>
	"message" in result && typeof result.message === "string" ? result.message : undefined;

export const useCreateProductSkuForm = (options?: UseCreateProductSkuFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			createProductSku,
			createToastCallbacks<ActionState>({
				loadingMessage: "Création de la variante...",
				showSuccessToast: false,
				showErrorToast: true,
				onSuccess: (result) => {
					const message = getMessage(result);
					if (message) options?.onSuccess?.(message);
				},
				onError: (result) => {
					const message = getMessage(result);
					if (!message) return;
					if ("status" in result && result.status === ActionStatus.VALIDATION_ERROR) {
						options?.onValidationError?.(message);
						return;
					}
					options?.onError?.(message);
				},
			}),
		),
		undefined,
	);

	const form = useAppForm({
		...createProductSkuFormOpts,
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state ?? {}) as Parameters<typeof mergeForm>[1]),
			[state],
		),
	});

	const tanstackErrors = useStore(form.store, (formState) => formState.errors);
	const serverErrors = extractServerErrors(state);
	const formErrors = Array.from(new Set([...tanstackErrors, ...serverErrors]));

	return {
		form,
		state,
		action,
		isPending,
		formErrors,
	};
};
