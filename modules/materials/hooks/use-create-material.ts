"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { createMaterial } from "@/modules/materials/actions/create-material";

interface UseCreateMaterialOptions {
	onSuccess?: (message: string) => void;
}

export function useCreateMaterial(options?: UseCreateMaterialOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			createMaterial,
			createToastCallbacks({
				loadingMessage: "Création en cours...",
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
