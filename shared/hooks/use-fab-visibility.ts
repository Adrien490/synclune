"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { setFabVisibility } from "@/shared/actions/set-fab-visibility";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { ActionStatus } from "@/shared/types/server-action";
import type { FabKey } from "@/shared/constants/fab";
import { toast } from "sonner";

interface UseFabVisibilityOptions {
	/** Clé du FAB (type-safe) */
	key: FabKey;
	/** Etat initial de visibilité (depuis le cookie serveur) */
	initialHidden?: boolean;
	/** Callback appelé immédiatement après un toggle (avant réponse serveur) */
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
 *   key: FAB_KEYS.ADMIN_SPEED_DIAL,
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
			onError: () => {
				// Rollback de l'état optimiste en cas d'erreur
				setOptimisticHidden(initialHidden);
				toast.error("Erreur lors de la modification");
			},
		}),
		undefined
	);

	/**
	 * Bascule la visibilité avec mise à jour optimiste
	 */
	const toggle = () => {
		const newHiddenState = !optimisticHidden;

		// Fire onToggle immediately for instant SR announcements and focus management
		onToggle?.(newHiddenState);

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
