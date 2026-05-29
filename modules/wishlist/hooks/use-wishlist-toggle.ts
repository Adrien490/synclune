"use client";

import { useActionState, useOptimistic, useTransition, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toggleWishlistItem } from "@/modules/wishlist/actions/toggle-wishlist-item";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { ActionStatus } from "@/shared/types/server-action";
import { useBadgeCountsStore } from "@/shared/stores/badge-counts-store";
import { useWishlistListOptimistic } from "@/modules/wishlist/contexts/wishlist-list-optimistic-context";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { showWishlistUndoToast } from "@/modules/wishlist/utils/show-wishlist-undo-toast";

interface UseWishlistToggleOptions {
	initialIsInWishlist?: boolean;
	onSuccess?: (action: "added" | "removed") => void;
	/**
	 * Affiche un toast « Annuler » à chaque retrait réussi. Recommandé sur PDP
	 * (un seul produit en vue), déconseillé en grille (trop bruyant).
	 */
	enableUndoToast?: boolean;
	/** Titre du produit injecté dans les toasts undo. */
	productTitle?: string;
}

/**
 * Hook pour toggle un article dans la wishlist
 *
 * Utilise useOptimistic pour une UX réactive avec rollback automatique en cas d'erreur
 */
export function useWishlistToggle(options?: UseWishlistToggleOptions) {
	const {
		initialIsInWishlist = false,
		onSuccess,
		enableUndoToast = false,
		productTitle,
	} = options ?? {};
	const router = useRouter();
	const pathname = usePathname();

	// Store pour optimistic UI du badge navbar
	const incrementWishlist = useBadgeCountsStore((state) => state.incrementWishlist);
	const decrementWishlist = useBadgeCountsStore((state) => state.decrementWishlist);

	// Contexte pour notifier la liste parente (optionnel, null si hors contexte)
	const wishlistListOptimistic = useWishlistListOptimistic();

	const [isTransitionPending, startTransition] = useTransition();
	const [optimisticIsInWishlist, setOptimisticIsInWishlist] = useOptimistic(initialIsInWishlist);

	// Ref pour tracker l'état actuel sans re-render (évite closure stale)
	const isInWishlistRef = useRef(initialIsInWishlist);

	// Ref pour protéger contre les clics rapides (race condition)
	const isProcessingRef = useRef(false);

	// Ref pour exposer le productId courant au callback onSuccess (le payload
	// server ne le renvoie pas, on le capture depuis le FormData côté hook).
	const lastProductIdRef = useRef<string | null>(null);

	// Mise à jour de la ref dans useEffect pour éviter setState pendant le render
	useEffect(() => {
		isInWishlistRef.current = optimisticIsInWishlist;
	}, [optimisticIsInWishlist]);

	const [state, formAction, isActionPending] = useActionState(
		withCallbacks(
			toggleWishlistItem,
			// eslint-disable-next-line react-hooks/refs -- refs are only read inside post-action callbacks
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
						if (enableUndoToast && actionType === "removed" && lastProductIdRef.current) {
							showWishlistUndoToast({
								productId: lastProductIdRef.current,
								productTitle,
								onRestored: () => router.refresh(),
							});
						}
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

					// Force re-fetch to restore optimistically removed grid items
					router.refresh();

					// Redirection vers connexion si non authentifié
					if (
						result &&
						typeof result === "object" &&
						"status" in result &&
						result.status === ActionStatus.UNAUTHORIZED
					) {
						const callbackURL = encodeURIComponent(pathname);
						router.push(`/connexion?callbackURL=${callbackURL}`);
					}
				},
			}),
		),
		undefined,
	);

	// Reset du flag de processing quand l'action est terminée
	useEffect(() => {
		if (!isTransitionPending && !isActionPending) {
			isProcessingRef.current = false;
		}
	}, [isTransitionPending, isActionPending]);

	const action = (formData: FormData) => {
		// Protection contre les clics rapides (race condition)
		if (isProcessingRef.current) {
			return;
		}
		isProcessingRef.current = true;

		// Capture productId pour les callbacks (undo toast, optimistic remove)
		const productIdFromForm = formData.get("productId");
		const productId =
			typeof productIdFromForm === "string" && productIdFromForm.length > 0
				? productIdFromForm
				: null;
		lastProductIdRef.current = productId;

		// Utilise la ref pour lire l'état actuel (évite closure stale)
		const currentState = isInWishlistRef.current;
		const newState = !currentState;

		// Haptique synchrone (pas une mise à jour d'état React → non affectée par la
		// transition de la form action). Le burst de cœurs optimiste est, lui, déclenché
		// côté composant dans le `onClick` du bouton (événement discret = commit immédiat).
		triggerHaptic(newState ? "medium" : "light");

		startTransition(() => {
			// Mise à jour optimistic de l'icône coeur
			setOptimisticIsInWishlist(newState);

			// Mise à jour optimistic du badge navbar (séparé pour éviter setState pendant render)
			if (newState) {
				incrementWishlist();
			} else {
				decrementWishlist();
				// Notifier la liste parente pour suppression visuelle immédiate
				if (productId && wishlistListOptimistic) {
					wishlistListOptimistic.onItemRemoved(productId);
				}
			}

			formAction(formData);
		});
	};

	return {
		state,
		isInWishlist: optimisticIsInWishlist,
		action,
		isPending: isTransitionPending || isActionPending,
	};
}
