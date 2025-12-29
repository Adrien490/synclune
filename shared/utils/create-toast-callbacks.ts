import { toast } from "sonner"

import type { ActionState } from "@/shared/types/server-action"
import type { CreateToastCallbacksOptions } from "@/shared/types/callback.types"

export type { CreateToastCallbacksOptions } from "@/shared/types/callback.types"

/**
 * Type guard pour vérifier si une valeur contient un message
 * @param value - La valeur à vérifier
 * @returns true si la valeur contient une propriété message de type string non vide
 */
export const hasMessage = (
	value: unknown
): value is { message: string; [key: string]: unknown } => {
	return (
		value !== null &&
		typeof value === "object" &&
		"message" in value &&
		typeof (value as { message: unknown }).message === "string" &&
		Boolean((value as { message: string }).message)
	);
};

/**
 * Crée les callbacks pour gérer les notifications toast avec les server actions
 *
 * @template T - Type du résultat de l'action (défaut: ActionState)
 * @param options - Options de configuration
 * @returns Un objet avec les callbacks onStart, onEnd, onSuccess et onError
 *
 * @example
 * ```typescript
 * const callbacks = createToastCallbacks({
 *   loadingMessage: "Ajout en cours...",
 *   successAction: {
 *     label: "Voir le panier",
 *     onClick: () => router.push("/panier")
 *   }
 * });
 * ```
 */
export const createToastCallbacks = <
	T extends ActionState | unknown = ActionState,
>(
	options: CreateToastCallbacksOptions<T> = {}
) => {
	const {
		loadingMessage,
		showSuccessToast = true,
		showErrorToast = true,
		onSuccess: customOnSuccess,
		onError: customOnError,
		successAction,
	} = options;

	return {
		onStart: () => {
			if (loadingMessage) {
				return toast.loading(loadingMessage);
			}
			return undefined;
		},
		onEnd: (reference: string | number | undefined) => {
			if (reference !== undefined) {
				toast.dismiss(reference);
			}
		},
		onSuccess: (result: T) => {
			// Call custom success callback if provided
			customOnSuccess?.(result);

			// Default toast behavior
			if (showSuccessToast && hasMessage(result)) {
				// Use Sonner's recommended object format for action
				if (successAction) {
					toast.success(result.message, {
						action: successAction,
					});
				} else {
					toast.success(result.message);
				}
			}
		},
		onError: (result: T) => {
			// Call custom error callback if provided
			customOnError?.(result);

			// Default toast behavior
			if (showErrorToast && hasMessage(result)) {
				toast.error(result.message);
			}
		},
	};
};
