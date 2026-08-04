import { unstable_rethrow } from "next/navigation";

import { GENERIC_ERROR_MESSAGE } from "@/shared/constants/error-messages";
import { ActionStatus } from "@/shared/types/server-action";
import type { ActionState } from "@/shared/types/server-action";
import type { Callbacks } from "@/shared/types/callback.types";

/**
 * Extrait le `status` d'un résultat d'action sans présumer de sa forme
 * (`undefined` pour un résultat custom qui n'en porte pas).
 */
export const getActionStatus = (result: unknown): ActionStatus | undefined => {
	if (result !== null && typeof result === "object" && "status" in result) {
		return (result as { status: ActionStatus }).status;
	}
	return undefined;
};

/**
 * Un callback UI qui throw ne doit ni maquiller le résultat réel de l'action
 * (la mutation serveur a déjà eu lieu — un état ERROR fabriqué pousserait
 * l'utilisateur à re-soumettre) ni faire tomber le formulaire sur une error
 * boundary. On échappe la pile courante : le handler global
 * d'`instrumentation-client.ts` capture l'erreur vers Sentry.
 */
const dispatchSafely = (dispatch: () => void): void => {
	try {
		dispatch();
	} catch (callbackError) {
		setTimeout(() => {
			throw callbackError;
		});
	}
};

export const withCallbacks = <T = ActionState, R = unknown>(
	fn: (prev: T | undefined, formData: FormData) => Promise<T>,
	callbacks: Callbacks<T, R>,
): ((prev: T | undefined, formData: FormData) => Promise<T>) => {
	return async (prev: T | undefined, formData: FormData) => {
		// Référence retournée par onStart (ex: id du toast loading)
		const reference = callbacks.onStart?.();
		const end = () => {
			if (reference != null) {
				dispatchSafely(() => callbacks.onEnd?.(reference));
			}
		};

		let result: T;
		try {
			result = await fn(prev, formData);
		} catch (error) {
			// Dismiss AVANT le re-throw : redirect() navigue sans démonter le Toaster
			// (root layout), et un toast.loading n'expire jamais de lui-même.
			end();

			// Signaux framework (redirect, notFound, forbidden…) : à laisser remonter
			// à Next, pas à convertir en toast d'erreur.
			unstable_rethrow(error);

			// Vraie exception. Message générique : les erreurs métier arrivent déjà en
			// ActionState via handleActionError, et en prod Next masque de toute façon
			// le message serveur (en anglais) — le détail vit dans les logs serveur/Sentry.
			const errorResult = {
				status: ActionStatus.ERROR,
				message: GENERIC_ERROR_MESSAGE,
			} as T;
			dispatchSafely(() => callbacks.onError?.(errorResult));
			return errorResult;
		}

		end();

		const status = getActionStatus(result);
		if (status === ActionStatus.SUCCESS) {
			dispatchSafely(() => callbacks.onSuccess?.(result));
		} else if (status === ActionStatus.WARNING) {
			dispatchSafely(() => callbacks.onWarning?.(result));
		} else if (status !== undefined && status !== ActionStatus.INITIAL) {
			dispatchSafely(() => callbacks.onError?.(result));
		}

		return result;
	};
};
