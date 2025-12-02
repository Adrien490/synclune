"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { updateMaterial } from "@/modules/materials/actions/update-material";

interface UseUpdateMaterialOptions {
	onSuccess?: (message: string) => void;
}

export function useUpdateMaterial(options?: UseUpdateMaterialOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateMaterial,
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

	return { state, action, isPending };
}
