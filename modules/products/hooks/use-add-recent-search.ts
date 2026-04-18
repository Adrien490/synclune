"use client";

import { useActionState, useTransition } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { ActionStatus } from "@/shared/types/server-action";
import { addRecentSearch } from "@/modules/products/actions/add-recent-search";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";

interface UseAddRecentSearchOptions {
	/** Callback apres ajout reussi */
	onSuccess?: (searches: string[]) => void;
	/** Callback en cas d'erreur */
	onError?: () => void;
}

/**
 * Hook pour ajouter une recherche recente
 *
 * @example
 * ```tsx
 * const { add, isPending } = useAddRecentSearch({
 *   onSuccess: (searches) => toast.success(`${searches.length} recherche(s) enregistree(s)`),
 * })
 *
 * <Button onClick={() => add("bague argent")} disabled={isPending}>
 *   Ajouter
 * </Button>
 * ```
 */
export function useAddRecentSearch(options?: UseAddRecentSearchOptions) {
	const { onSuccess, onError } = options ?? {};

	const [isTransitionPending, startTransition] = useTransition();

	const consentAccepted = useCookieConsentStore((state) => state.accepted);
	const hasHydrated = useCookieConsentStore((state) => state._hasHydrated);

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(addRecentSearch, {
			onSuccess: (result) => {
				if (result.data && typeof result.data === "object" && "searches" in result.data) {
					onSuccess?.(result.data.searches as string[]);
				}
			},
			onError: () => {
				onError?.();
			},
		}),
		undefined,
	);

	/**
	 * Ajoute un terme aux recherches recentes.
	 * RGPD : skip silencieusement si le consentement n'est pas accordé.
	 */
	const add = (term: string) => {
		if (isTransitionPending || isActionPending) return;
		if (!hasHydrated || consentAccepted !== true) return;
		startTransition(() => {
			const formData = new FormData();
			formData.set("term", term);
			formAction(formData);
		});
	};

	return {
		state,
		add,
		isPending: isTransitionPending || isActionPending,
		isSuccess: state?.status === ActionStatus.SUCCESS,
		isError: state?.status === ActionStatus.ERROR,
	};
}
