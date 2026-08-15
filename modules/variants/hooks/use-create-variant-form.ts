"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { createVariant } from "@/modules/variants/actions/create-variant";
import { createProductVariantFormOpts } from "@/modules/variants/constants/create-variant-form-options";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

interface UseCreateProductVariantFormOptions {
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
	onValidationError?: (message: string) => void;
}

const getMessage = (result: ActionState): string | undefined =>
	"message" in result && typeof result.message === "string" ? result.message : undefined;

export const useCreateProductVariantForm = (options?: UseCreateProductVariantFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			createVariant,
			createToastCallbacks<ActionState>({
				loadingMessage: "Création de la variante…",
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
		...createProductVariantFormOpts,
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state ?? {}) as Parameters<typeof mergeForm>[1]),
			[state],
		),
	});

	return {
		form,
		state,
		action,
		isPending,
	};
};
