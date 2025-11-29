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
