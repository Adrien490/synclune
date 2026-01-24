"use client"

import { useActionState, useOptimistic, useTransition } from "react"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { ActionStatus } from "@/shared/types/server-action"
import { removeRecentSearch } from "@/modules/products/actions/remove-recent-search"
import { clearRecentSearches } from "@/modules/products/actions/clear-recent-searches"

interface UseRecentSearchesOptions {
	/** Liste initiale des recherches (depuis le serveur) */
	initialSearches: string[]
	/** Callback apres suppression individuelle reussie */
	onRemoveSuccess?: (searches: string[]) => void
	/** Callback en cas d'erreur de suppression individuelle */
	onRemoveError?: () => void
	/** Callback apres suppression totale reussie */
	onClearSuccess?: () => void
	/** Callback en cas d'erreur de suppression totale */
	onClearError?: () => void
}

/**
 * Hook unifie pour gerer les recherches recentes avec mise a jour optimiste
 *
 * Combine la suppression individuelle et totale avec un seul etat optimiste
 * pour garantir que les deux operations mettent a jour l'affichage immediatement.
 *
 * @example
 * ```tsx
 * const { searches, remove, clear, isPending, isEmpty } = useRecentSearches({
 *   initialSearches: ["bague", "collier"],
 *   onRemoveSuccess: (searches) => console.log("Restant:", searches),
 *   onClearSuccess: () => console.log("Tout efface"),
 * })
 *
 * <Button onClick={() => remove("bague")} disabled={isPending}>
 *   Supprimer
 * </Button>
 * <Button onClick={clear} disabled={isPending}>
 *   Effacer tout
 * </Button>
 * ```
 */
export function useRecentSearches(options: UseRecentSearchesOptions) {
	const {
		initialSearches,
		onRemoveSuccess,
		onRemoveError,
		onClearSuccess,
		onClearError,
	} = options

	const [isTransitionPending, startTransition] = useTransition()

	// Etat optimiste unique pour les deux operations
	const [optimisticSearches, setOptimisticSearches] =
		useOptimistic(initialSearches)

	// Action remove
	const [removeState, removeFormAction, isRemovePending] = useActionState(
		withCallbacks(removeRecentSearch, {
			onSuccess: (result) => {
				if (
					result?.data &&
					typeof result.data === "object" &&
					"searches" in result.data
				) {
					onRemoveSuccess?.(result.data.searches as string[])
				}
			},
			onError: () => {
				// Rollback de l'etat optimiste
				setOptimisticSearches(initialSearches)
				onRemoveError?.()
			},
		}),
		undefined
	)

	// Action clear
	const [clearState, clearFormAction, isClearPending] = useActionState(
		withCallbacks(clearRecentSearches, {
			onSuccess: () => onClearSuccess?.(),
			onError: () => {
				// Rollback de l'etat optimiste
				setOptimisticSearches(initialSearches)
				onClearError?.()
			},
		}),
		undefined
	)

	const isPending = isTransitionPending || isRemovePending || isClearPending

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
			removeFormAction(formData)
		})
	}

	/**
	 * Efface toutes les recherches recentes
	 */
	const clear = () => {
		// Guard contre double-click
		if (isPending) return

		startTransition(() => {
			// Mise a jour optimiste
			setOptimisticSearches([])

			clearFormAction(new FormData())
		})
	}

	return {
		searches: optimisticSearches,
		remove,
		clear,
		isPending,
		isEmpty: optimisticSearches.length === 0,
		removeState,
		clearState,
		isRemoveSuccess: removeState?.status === ActionStatus.SUCCESS,
		isRemoveError: removeState?.status === ActionStatus.ERROR,
		isClearSuccess: clearState?.status === ActionStatus.SUCCESS,
		isClearError: clearState?.status === ActionStatus.ERROR,
	}
}
