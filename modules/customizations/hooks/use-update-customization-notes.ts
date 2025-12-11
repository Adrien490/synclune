"use client";

import { useActionState } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateCustomizationNotes } from "../actions/update-customization-notes";

interface UseUpdateCustomizationNotesOptions {
	onSuccess?: () => void;
}

export function useUpdateCustomizationNotes(
	options?: UseUpdateCustomizationNotesOptions
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCustomizationNotes,
			createToastCallbacks({
				loadingMessage: "Enregistrement...",
				onSuccess: () => options?.onSuccess?.(),
			})
		),
		undefined
	);

	return { state, action, isPending };
}
