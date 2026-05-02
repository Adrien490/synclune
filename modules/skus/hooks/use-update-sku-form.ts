"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { extractServerErrors } from "@/shared/utils/extract-server-errors";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { updateProductSku } from "@/modules/skus/actions/update-sku";
import type { SkuWithImages } from "@/modules/skus/data/get-sku";
import { getUpdateProductSkuFormOpts } from "@/modules/skus/utils/form-options";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

interface UseUpdateProductSkuFormOptions {
	sku: SkuWithImages;
	onSuccess?: (message: string, data?: { productSlug?: string }) => void;
	onError?: (message: string) => void;
	onValidationError?: (message: string) => void;
}

const getMessage = (result: ActionState): string | undefined =>
	"message" in result && typeof result.message === "string" ? result.message : undefined;

const getData = (result: ActionState): { productSlug?: string } | undefined =>
	"data" in result && result.data ? (result.data as { productSlug?: string }) : undefined;

export const useUpdateProductSkuForm = ({
	sku,
	onSuccess,
	onError,
	onValidationError,
}: UseUpdateProductSkuFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateProductSku,
			createToastCallbacks<ActionState>({
				loadingMessage: "Mise à jour de la variante...",
				showSuccessToast: false,
				showErrorToast: true,
				onSuccess: (result) => {
					const message = getMessage(result);
					if (message) onSuccess?.(message, getData(result));
				},
				onError: (result) => {
					const message = getMessage(result);
					if (!message) return;
					if ("status" in result && result.status === ActionStatus.VALIDATION_ERROR) {
						onValidationError?.(message);
						return;
					}
					onError?.(message);
				},
			}),
		),
		undefined,
	);

	const formOpts = getUpdateProductSkuFormOpts(sku);

	const form = useAppForm({
		...formOpts,
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
