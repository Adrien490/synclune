"use client"

import { useActionState, useOptimistic, useTransition } from "react"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { ActionStatus } from "@/shared/types/server-action"
import { clearRecentSearches } from "@/shared/actions/clear-recent-searches"

interface UseClearRecentSearchesOptions {
	/** Liste initiale des recherches (depuis le serveur) */
	initialSearches: string[]
	/** Callback apres suppression reussie */
	onSuccess?: () => void
	/** Callback en cas d'erreur */
	onError?: () => void
}

/**
 * Hook pour effacer toutes les recherches recentes avec mise a jour optimiste
 *
 * @example
 * ```tsx
 * const { clear, searches, isPending } = useClearRecentSearches({
 *   initialSearches: ["bague", "collier"],
 *   onSuccess: () => console.log("Tout efface"),
 * })
 *
 * <Button onClick={clear} disabled={isPending}>
 *   Effacer tout
 * </Button>
 * ```
 */
export function useClearRecentSearches(options: UseClearRecentSearchesOptions) {
	const { initialSearches, onSuccess, onError } = options

	const [isTransitionPending, startTransition] = useTransition()

	// Etat optimiste pour une UX reactive
	const [optimisticSearches, setOptimisticSearches] =
		useOptimistic(initialSearches)

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(clearRecentSearches, {
			onSuccess: () => {
				onSuccess?.()
			},
			onError: () => {
				// Rollback de l'etat optimiste
				setOptimisticSearches(initialSearches)
				onError?.()
			},
		}),
		undefined
	)

	/**
	 * Efface toutes les recherches recentes
	 */
	const clear = () => {
		startTransition(() => {
			// Mise a jour optimiste
			setOptimisticSearches([])

			const formData = new FormData()
			formAction(formData)
		})
	}

	return {
		state,
		searches: optimisticSearches,
		clear,
		isPending: isTransitionPending || isActionPending,
		isEmpty: optimisticSearches.length === 0,
		isSuccess: state?.status === ActionStatus.SUCCESS,
		isError: state?.status === ActionStatus.ERROR,
	}
}
