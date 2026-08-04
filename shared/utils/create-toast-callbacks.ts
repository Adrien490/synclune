import { toast } from "@/shared/utils/toast";

import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import type { Callbacks, CreateToastCallbacksOptions } from "@/shared/types/callback.types";
import { getActionStatus } from "@/shared/utils/with-callbacks";

/**
 * Type guard pour vérifier si une valeur contient un message
 * @param value - La valeur à vérifier
 * @returns true si la valeur contient une propriété message de type string non vide
 */
export const hasMessage = (
	value: unknown,
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
 * @returns Un objet avec les callbacks onStart, onEnd, onSuccess, onWarning et onError
 *
 * @example
 * ```typescript
 * const callbacks = createToastCallbacks({
 *   loadingMessage: "Ajout en cours…",
 *   successAction: {
 *     label: "Voir mes favoris",
 *     onClick: () => router.push("/favoris")
 *   }
 * });
 * ```
 */
export const createToastCallbacks = <T = ActionState>(
	options: CreateToastCallbacksOptions<T> = {},
) => {
	const {
		loadingMessage,
		showSuccessToast = true,
		showErrorToast = true,
		onSuccess: customOnSuccess,
		onWarning: customOnWarning,
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
			if (reference != null) {
				toast.dismiss(reference);
			}
		},
		onSuccess: (result: T) => {
			customOnSuccess?.(result);

			if (showSuccessToast && hasMessage(result)) {
				if (successAction) {
					toast.success(result.message, {
						action: successAction,
					});
				} else {
					toast.success(result.message);
				}
			}
		},
		onWarning: (result: T) => {
			customOnWarning?.(result);

			if (hasMessage(result)) {
				toast.warning(result.message);
			}
		},
		onError: (result: T) => {
			customOnError?.(result);

			// Toast skippé pour les erreurs de validation, déjà affichées inline par les champs
			if (showErrorToast && hasMessage(result)) {
				if (getActionStatus(result) !== ActionStatus.VALIDATION_ERROR) {
					toast.error(result.message);
				}
			}
		},
	} satisfies Callbacks<T, string | number | undefined>;
};
