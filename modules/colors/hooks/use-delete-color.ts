"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { deleteColor } from "@/modules/colors/actions/delete-color";

interface UseDeleteColorOptions {
	onSuccess?: (message: string) => void;
}

export function useDeleteColor(options?: UseDeleteColorOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteColor,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
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

	return { state, action, isPending };
}
