import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { isRedirectError } from "next/dist/client/components/redirect-error";

/**
 * Fonction d'ordre supérieur qui enveloppe une server action avec des callbacks lifecycle
 *
 * Permet d'ajouter des callbacks (onStart, onEnd, onSuccess, onError) autour d'une
 * server action pour gérer les états de chargement, succès et erreur.
 *
 * @template T - Type du résultat de l'action (défaut: ActionState)
 * @template R - Type de la référence retournée par onStart (ex: ID du toast)
 * @param fn - La server action à envelopper
 * @param callbacks - Les callbacks à exécuter aux différentes étapes du lifecycle
 * @returns Une nouvelle fonction compatible avec useActionState
 *
 * @example
 * ```typescript
 * const [state, action, isPending] = useActionState(
 *   withCallbacks(myServerAction, createToastCallbacks({
 *     loadingMessage: "Chargement..."
 *   })),
 *   undefined
 * );
 * ```
 */

/**
 * Callbacks pour le lifecycle d'une server action
 * @template T - Type du résultat de l'action
 * @template R - Type de la référence retournée par onStart (ex: ID du toast)
 */
export type Callbacks<T, R = unknown> = {
	/** Appelé au démarrage de l'action, retourne une référence optionnelle */
	onStart?: () => R;
	/** Appelé à la fin de l'action avec la référence de onStart */
	onEnd?: (reference: R) => void;
	/** Appelé si l'action réussit (status === SUCCESS) */
	onSuccess?: (result: T) => void;
	/** Appelé si l'action échoue (status !== SUCCESS) */
	onError?: (result: T) => void;
};

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
			// Propager les erreurs de redirection Next.js (redirect() lance une exception)
			if (isRedirectError(error)) {
				throw error;
			}

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
