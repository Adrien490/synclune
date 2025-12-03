"use client";

import { useAppForm } from "@/shared/components/tanstack-form";
import { ActionState } from "@/shared/types/server-action";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { mergeForm, useStore, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState } from "react";
import { contactAdrien } from "@/modules/dashboard/actions/contact-adrien";
import type { FeedbackType } from "../constants/contact-adrien.constants";

interface UseContactAdrienFormOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour le formulaire de contact Adrien
 * Utilise TanStack Form avec Next.js App Router
 */
export function useContactAdrienForm(options?: UseContactAdrienFormOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			contactAdrien,
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
			})
		),
		undefined
	);

	const form = useAppForm({
		defaultValues: {
			type: "bug" as FeedbackType,
			message: "",
		},
		transform: useTransform(
			// Merge server state with form state for validation errors
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	const formErrors = useStore(form.store, (formState) => formState.errors);

	return {
		form,
		state,
		action,
		isPending,
		formErrors,
	};
}
