"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { duplicateColor } from "@/modules/colors/actions/duplicate-color";
import { ActionStatus } from "@/shared/types/server-action";

interface UseDuplicateColorOptions {
	onSuccess?: (data: { id: string; name: string }) => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour dupliquer une couleur
 */
export function useDuplicateColor(options?: UseDuplicateColorOptions) {
	const [isPending, startTransition] = useTransition();

	const duplicate = (colorId: string, colorName: string) => {
		startTransition(async () => {
			const toastId = toast.loading(`Duplication de ${colorName}...`);

			try {
				const result = await duplicateColor(colorId);
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
	};

	return {
		duplicate,
		isPending,
	};
}
