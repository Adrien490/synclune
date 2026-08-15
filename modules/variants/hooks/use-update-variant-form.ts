"use client";

import { useAppForm } from "@/shared/components/forms";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { updateVariant } from "@/modules/variants/actions/update-variant";
import type { VariantDetail } from "@/modules/variants/data/get-variant";
import { getUpdateProductVariantFormOpts } from "@/modules/variants/utils/form-options";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

interface UseUpdateProductVariantFormOptions {
	variant: VariantDetail;
	onSuccess?: (message: string, data?: { productSlug?: string }) => void;
	onError?: (message: string) => void;
	onValidationError?: (message: string) => void;
}

const getMessage = (result: ActionState): string | undefined =>
	"message" in result && typeof result.message === "string" ? result.message : undefined;

const getData = (result: ActionState): { productSlug?: string } | undefined =>
	"data" in result && result.data ? (result.data as { productSlug?: string }) : undefined;

export const useUpdateProductVariantForm = ({
	variant,
	onSuccess,
	onError,
	onValidationError,
}: UseUpdateProductVariantFormOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateVariant,
			createToastCallbacks<ActionState>({
				loadingMessage: "Mise à jour de la variante…",
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

	const formOpts = getUpdateProductVariantFormOpts(variant);

	const form = useAppForm({
		...formOpts,
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
