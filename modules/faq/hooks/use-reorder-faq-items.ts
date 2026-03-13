"use client";

import { useActionState, useTransition } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { reorderFaqItems } from "../actions/reorder-faq-items";

export const useReorderFaqItems = () => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(reorderFaqItems, createToastCallbacks()),
		undefined,
	);

	const [isTransitionPending, startTransition] = useTransition();

	const reorder = (items: { id: string; position: number }[]) => {
		const formData = new FormData();
		formData.append("items", JSON.stringify(items));
		startTransition(() => {
			formAction(formData);
		});
	};

	return {
		state,
		action: formAction,
		isPending: isFormPending || isTransitionPending,
		reorder,
	};
};
