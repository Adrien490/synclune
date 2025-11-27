"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";
import { deleteColor } from "@/modules/colors/actions/delete-color";

export function useDeleteColor() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteColor,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
