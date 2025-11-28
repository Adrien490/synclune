"use client";

import { useActionState, useOptimistic, useCallback, useTransition } from "react";
import { setContactAdrienVisibility } from "@/modules/dashboard/actions/set-contact-adrien-visibility";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { ActionStatus } from "@/shared/types/server-action";

interface UseToggleContactAdrienVisibilityOptions {
	initialHidden?: boolean;
	onToggle?: (isHidden: boolean) => void;
}

/**
 * Hook pour basculer la visibilité du bouton Contact Adrien
 *
 * Utilise useOptimistic pour une UX réactive avec rollback automatique en cas d'erreur
 *
 * @example
 * ```tsx
 * const { isHidden, toggle, isPending } = useToggleContactAdrienVisibility({
 *   initialHidden: false,
 * });
 *
 * <Button onClick={toggle} disabled={isPending}>
 *   {isHidden ? "Afficher" : "Masquer"}
 * </Button>
 * ```
 */
export function useToggleContactAdrienVisibility(
	options?: UseToggleContactAdrienVisibilityOptions
) {
	const { initialHidden = false, onToggle } = options ?? {};

	// Transition pour wrapper les appels async
	const [isTransitionPending, startTransition] = useTransition();

	// État optimiste pour une UX réactive
	const [optimisticHidden, setOptimisticHidden] = useOptimistic(initialHidden);

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(setContactAdrienVisibility, {
			onSuccess: (result) => {
				if (result?.data && typeof result.data === "object" && "isHidden" in result.data) {
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
	const toggle = useCallback(() => {
		const newHiddenState = !optimisticHidden;

		startTransition(() => {
			// Mise à jour optimiste immédiate (doit être dans la transition)
			setOptimisticHidden(newHiddenState);

			// Appel de l'action serveur
			const formData = new FormData();
			formData.append("isHidden", newHiddenState.toString());
			formAction(formData);
		});
	}, [optimisticHidden, setOptimisticHidden, formAction, startTransition]);

	return {
		state,
		isHidden: optimisticHidden,
		toggle,
		isPending: isTransitionPending || isActionPending,
		// Vérifie si la dernière action a réussi
		isSuccess: state?.status === ActionStatus.SUCCESS,
		isError: state?.status === ActionStatus.ERROR,
	};
}
