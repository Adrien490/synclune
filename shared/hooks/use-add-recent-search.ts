"use client"

import { useActionState, useTransition } from "react"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { ActionStatus } from "@/shared/types/server-action"
import { addRecentSearch } from "@/modules/products/actions/add-recent-search"

interface UseAddRecentSearchOptions {
	/** Callback apres ajout reussi */
	onSuccess?: (searches: string[]) => void
	/** Callback en cas d'erreur */
	onError?: () => void
}

/**
 * Hook pour ajouter une recherche recente
 *
 * @example
 * ```tsx
 * const { add, isPending } = useAddRecentSearch({
 *   onSuccess: (searches) => console.log("Nouveau:", searches),
 * })
 *
 * <Button onClick={() => add("bague argent")} disabled={isPending}>
 *   Ajouter
 * </Button>
 * ```
 */
export function useAddRecentSearch(options?: UseAddRecentSearchOptions) {
	const { onSuccess, onError } = options ?? {}

	const [isTransitionPending, startTransition] = useTransition()

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(addRecentSearch, {
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
				onError?.()
			},
		}),
		undefined
	)

	/**
	 * Ajoute un terme aux recherches recentes
	 */
	const add = (term: string) => {
		if (isTransitionPending || isActionPending) return
		startTransition(() => {
			const formData = new FormData()
			formData.set("term", term)
			formAction(formData)
		})
	}

	return {
		state,
		add,
		isPending: isTransitionPending || isActionPending,
		isSuccess: state?.status === ActionStatus.SUCCESS,
		isError: state?.status === ActionStatus.ERROR,
	}
}
