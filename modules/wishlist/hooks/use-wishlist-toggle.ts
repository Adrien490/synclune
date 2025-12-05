"use client";

import {
	useActionState,
	useOptimistic,
	useCallback,
	useTransition,
	useRef,
	useEffect,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { toggleWishlistItem } from "@/modules/wishlist/actions/toggle-wishlist-item";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { ActionStatus } from "@/shared/types/server-action";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";

interface UseWishlistToggleOptions {
	initialIsInWishlist?: boolean;
	onSuccess?: (action: "added" | "removed") => void;
}

/**
 * Hook pour toggle un article dans la wishlist
 *
 * Utilise useOptimistic pour une UX réactive avec rollback automatique en cas d'erreur
 *
 * @example
 * ```tsx
 * const { isInWishlist, action, isPending } = useWishlistToggle({
 *   initialIsInWishlist: false,
 * });
 *
 * <form action={action}>
 *   <input type="hidden" name="skuId" value={skuId} />
 *   <button disabled={isPending}>
 *     <HeartIcon variant={isInWishlist ? 'filled' : 'outline'} />
 *   </button>
 * </form>
 * ```
 */
export function useWishlistToggle(options?: UseWishlistToggleOptions) {
	const { initialIsInWishlist = false, onSuccess } = options ?? {};
	const router = useRouter();
	const pathname = usePathname();

	// Store pour optimistic UI du badge navbar
	const incrementWishlist = useBadgeCountsStore(
		(state) => state.incrementWishlist
	);
	const decrementWishlist = useBadgeCountsStore(
		(state) => state.decrementWishlist
	);

	const [isTransitionPending, startTransition] = useTransition();
	const [optimisticIsInWishlist, setOptimisticIsInWishlist] = useOptimistic(
		initialIsInWishlist
	);

	// Ref pour tracker l'état actuel sans re-render (évite closure stale)
	const isInWishlistRef = useRef(initialIsInWishlist);

	// Mise à jour de la ref dans useEffect pour éviter setState pendant le render
	useEffect(() => {
		isInWishlistRef.current = optimisticIsInWishlist;
	}, [optimisticIsInWishlist]);

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(
			toggleWishlistItem,
			createToastCallbacks({
				// Pas de toast succès, juste le callback
				showSuccessToast: false,
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"data" in result &&
						result.data &&
						typeof result.data === "object" &&
						"action" in result.data
					) {
						const actionType = result.data.action as "added" | "removed";
						onSuccess?.(actionType);
					}
				},
				onError: (result: unknown) => {
					// Rollback de l'état optimiste (coeur)
					setOptimisticIsInWishlist(initialIsInWishlist);

					// Rollback du badge navbar
					if (initialIsInWishlist) {
						incrementWishlist(); // On avait decrementé à tort
					} else {
						decrementWishlist(); // On avait incrementé à tort
					}

					// Redirection vers connexion si non authentifié
					if (
						result &&
						typeof result === "object" &&
						"status" in result &&
						result.status === ActionStatus.UNAUTHORIZED
					) {
						const callbackUrl = encodeURIComponent(pathname);
						router.push(`/connexion?callbackUrl=${callbackUrl}`);
					}
				},
			})
		),
		undefined
	);

	const action = useCallback(
		(formData: FormData) => {
			startTransition(() => {
				// Utilise la ref pour lire l'état actuel (évite closure stale)
				const currentState = isInWishlistRef.current;
				const newState = !currentState;

				// Mise à jour optimistic de l'icône coeur
				setOptimisticIsInWishlist(newState);

				// Mise à jour optimistic du badge navbar (séparé pour éviter setState pendant render)
				if (newState) {
					incrementWishlist();
				} else {
					decrementWishlist();
				}

				formAction(formData);
			});
		},
		[setOptimisticIsInWishlist, formAction, incrementWishlist, decrementWishlist]
	);

	return {
		state,
		isInWishlist: optimisticIsInWishlist,
		action,
		isPending: isTransitionPending || isActionPending,
	};
}
