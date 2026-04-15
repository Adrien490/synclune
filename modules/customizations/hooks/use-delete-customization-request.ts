"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { deleteCustomizationRequest } from "../actions/delete-customization-request";

interface UseDeleteCustomizationRequestOptions {
	onSuccess?: () => void;
}

export function useDeleteCustomizationRequest(options?: UseDeleteCustomizationRequestOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteCustomizationRequest,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
