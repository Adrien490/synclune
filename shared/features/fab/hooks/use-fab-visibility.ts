"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { setFabVisibility } from "../actions/set-fab-visibility";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { ActionStatus } from "@/shared/types/server-action";
import type { FabKey } from "../constants";

interface UseFabVisibilityOptions {
	/** Clé du FAB (type-safe) */
	key: FabKey;
	/** Etat initial de visibilité (depuis le cookie serveur) */
	initialHidden?: boolean;
	/** Callback appelé après un toggle réussi */
	onToggle?: (isHidden: boolean) => void;
}

/**
 * Hook pour basculer la visibilité d'un FAB
 *
 * Utilise useOptimistic pour une UX réactive avec rollback automatique en cas d'erreur
 *
 * @example
 * ```tsx
 * const { isHidden, toggle, isPending } = useFabVisibility({
 *   key: FAB_KEYS.CONTACT_ADRIEN,
 *   initialHidden: false,
 * });
 *
 * <Button onClick={toggle} disabled={isPending}>
 *   {isHidden ? "Afficher" : "Masquer"}
 * </Button>
 * ```
 */
export function useFabVisibility(options: UseFabVisibilityOptions) {
	const { key, initialHidden = false, onToggle } = options;

	// Transition pour wrapper les appels async
	const [isTransitionPending, startTransition] = useTransition();

	// État optimiste pour une UX réactive
	const [optimisticHidden, setOptimisticHidden] = useOptimistic(initialHidden);

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(setFabVisibility, {
			onSuccess: (result) => {
				if (
					result?.data &&
					typeof result.data === "object" &&
					"isHidden" in result.data
				) {
					onToggle?.(result.data.isHidden as boolean);
				}
			},
			onError: () => {
				// Rollback de l'état optimiste en cas d'erreur
				setOptimisticHidden(initialHidden);
			},
		}),
		undefined
	);

	/**
	 * Bascule la visibilité avec mise à jour optimiste
	 */
	const toggle = () => {
		const newHiddenState = !optimisticHidden;

		startTransition(() => {
			// Mise à jour optimiste immédiate (doit être dans la transition)
			setOptimisticHidden(newHiddenState);

			// Appel de l'action serveur
			const formData = new FormData();
			formData.append("key", key);
			formData.append("isHidden", newHiddenState.toString());
			formAction(formData);
		});
	};

	return {
		state,
		isHidden: optimisticHidden,
		toggle,
		isPending: isTransitionPending || isActionPending,
		isSuccess: state?.status === ActionStatus.SUCCESS,
		isError: state?.status === ActionStatus.ERROR,
	};
}
