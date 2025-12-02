"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { deleteMaterial } from "@/modules/materials/actions/delete-material";

interface UseDeleteMaterialOptions {
	onSuccess?: (message: string) => void;
}

export function useDeleteMaterial(options?: UseDeleteMaterialOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteMaterial,
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
