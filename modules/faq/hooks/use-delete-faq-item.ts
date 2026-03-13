"use client";

import { useActionState, useTransition } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { deleteFaqItem } from "../actions/delete-faq-item";

interface UseDeleteFaqItemOptions {
	onSuccess?: (message: string) => void;
}

export const useDeleteFaqItem = (options?: UseDeleteFaqItemOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			deleteFaqItem,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			}),
		),
		undefined,
	);

	const [isTransitionPending, startTransition] = useTransition();

	const handle = (faqItemId: string) => {
		const formData = new FormData();
		formData.append("id", faqItemId);
		startTransition(() => {
			formAction(formData);
		});
	};

	return {
		state,
		action: formAction,
		isPending: isFormPending || isTransitionPending,
		handle,
	};
};
