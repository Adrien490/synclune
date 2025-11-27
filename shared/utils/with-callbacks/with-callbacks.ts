import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { Callbacks } from "./types";

/**
 * Fonction d'ordre supérieur qui enveloppe une action serveur et ajoute des callbacks
 * pour la gestion d'état (démarrage, fin, succès, erreur)
 *
 * @param fn La fonction d'action serveur à envelopper
 * @param callbacks Les callbacks à exécuter aux différentes étapes
 * @returns Une nouvelle fonction qui exécute l'action serveur avec les callbacks
 */
export const withCallbacks = <
	T extends ActionState | unknown = ActionState,
	R = unknown,
>(
	fn: (prev: T | undefined, formData: FormData) => Promise<T>,
	callbacks: Callbacks<T, R>
): ((prev: T | undefined, formData: FormData) => Promise<T>) => {
	return async (prev: T | undefined, formData: FormData) => {
		// Appel du callback de démarrage et récupération de la référence (pour les toasts par exemple)
		const reference = callbacks.onStart?.();

		try {
			const result = await fn(prev, formData);

			// Appel du callback de fin si une référence est disponible
			if (reference) {
				callbacks.onEnd?.(reference);
			}

			// Appel du callback de succès si l'action a réussi
			if (
				result &&
				typeof result === "object" &&
				"status" in result &&
				result.status === ActionStatus.SUCCESS
			) {
				callbacks.onSuccess?.(result);
			}
			// Appel du callback d'erreur pour tous les autres cas
			else if (
				result &&
				typeof result === "object" &&
				"status" in result &&
				result.status !== ActionStatus.SUCCESS
			) {
				callbacks.onError?.(result);
			}

			return result;
		} catch (error) {
			// Garantir que le callback de fin est appelé même en cas d'exception
			// (important pour dismisser les toasts loading)
			if (reference) {
				callbacks.onEnd?.(reference);
			}

			// Créer un ActionState d'erreur pour les exceptions non catchées
			const errorResult = {
				status: ActionStatus.ERROR,
				message:
					error instanceof Error
						? error.message
						: "Une erreur inattendue est survenue",
			} as T;

			// Appeler le callback d'erreur
			callbacks.onError?.(errorResult);

			return errorResult;
		}
	};
};
