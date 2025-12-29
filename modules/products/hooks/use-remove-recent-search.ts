"use client"

import { useActionState, useOptimistic, useTransition } from "react"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { ActionStatus } from "@/shared/types/server-action"
import { removeRecentSearch } from "@/modules/products/actions/remove-recent-search"

interface UseRemoveRecentSearchOptions {
	/** Liste initiale des recherches (depuis le serveur) */
	initialSearches: string[]
	/** Callback apres suppression reussie */
	onSuccess?: (searches: string[]) => void
	/** Callback en cas d'erreur */
	onError?: () => void
}

/**
 * Hook pour supprimer une recherche recente avec mise a jour optimiste
 *
 * @example
 * ```tsx
 * const { remove, searches, isPending } = useRemoveRecentSearch({
 *   initialSearches: ["bague", "collier"],
 *   onSuccess: (searches) => console.log("Restant:", searches),
 * })
 *
 * <Button onClick={() => remove("bague")} disabled={isPending}>
 *   Supprimer
 * </Button>
 * ```
 */
export function useRemoveRecentSearch(options: UseRemoveRecentSearchOptions) {
	const { initialSearches, onSuccess, onError } = options

	const [isTransitionPending, startTransition] = useTransition()

	// Etat optimiste pour une UX reactive
	const [optimisticSearches, setOptimisticSearches] =
		useOptimistic(initialSearches)

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(removeRecentSearch, {
			onSuccess: (result) => {
				if (
					result?.data &&
					typeof result.data === "object" &&
					"searches" in result.data
				) {
					onSuccess?.(result.data.searches as string[])
				}
			},
			onError: () => {
				// Rollback de l'etat optimiste
				setOptimisticSearches(initialSearches)
				onError?.()
			},
		}),
		undefined
	)

	const isPending = isTransitionPending || isActionPending

	/**
	 * Supprime un terme des recherches recentes
	 */
	const remove = (term: string) => {
		// Guard contre double-click
		if (isPending) return

		startTransition(() => {
			// Mise a jour optimiste
			setOptimisticSearches(optimisticSearches.filter((s) => s !== term))

			const formData = new FormData()
			formData.set("term", term)
			formAction(formData)
		})
	}

	return {
		state,
		searches: optimisticSearches,
		remove,
		isPending,
		isSuccess: state?.status === ActionStatus.SUCCESS,
		isError: state?.status === ActionStatus.ERROR,
	}
}
