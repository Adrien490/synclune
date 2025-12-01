"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { duplicateMaterial } from "@/modules/materials/actions/duplicate-material";
import { ActionStatus } from "@/shared/types/server-action";

interface UseDuplicateMaterialOptions {
	onSuccess?: (data: { id: string; name: string }) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer un materiau
 */
export function useDuplicateMaterial(options?: UseDuplicateMaterialOptions) {
	const [isPending, startTransition] = useTransition();

	const duplicate = useCallback(
		(materialId: string, materialName: string) => {
			startTransition(async () => {
				const toastId = toast.loading(`Duplication de ${materialName}...`);

				try {
					const result = await duplicateMaterial(materialId);
					toast.dismiss(toastId);

					if (result.status === ActionStatus.SUCCESS) {
						toast.success(result.message);
						if (result.data) {
							options?.onSuccess?.(result.data as { id: string; name: string });
						}
					} else {
						toast.error(result.message);
						options?.onError?.(result.message);
					}
				} catch (error) {
					toast.dismiss(toastId);
					const message =
						error instanceof Error
							? error.message
							: "Erreur lors de la duplication";
					toast.error(message);
					options?.onError?.(message);
				}
			});
		},
		[options]
	);

	return {
		duplicate,
		isPending,
	};
}
