"use client";

import { useAppForm } from "@/shared/components/forms";
import { updateCartItem } from "@/modules/cart/actions/update-cart-item";
import { ActionStatus } from "@/shared/types/server-action";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";
import { useActionState, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { cartItemQuantityFormOpts } from "../lib/cart-item-quantity-form-options";

interface UseCartItemQuantityFormOptions {
	cartItemId: string;
	currentQuantity: number;
}

/**
 * Hook pour le formulaire de mise à jour de la quantité d'un article du panier
 * Utilise TanStack Form avec debounce pour éviter le spam d'appels serveur
 *
 * Fonctionnalités :
 * - Optimistic UI : mise à jour immédiate via TanStack Form state
 * - Debounce : évite le spam d'appels serveur (300ms)
 * - Synchronisation : synchro automatique quand currentQuantity change (après succès serveur)
 * - Rollback automatique en cas d'erreur serveur
 */
export const useCartItemQuantityForm = ({
	cartItemId,
	currentQuantity,
}: UseCartItemQuantityFormOptions) => {
	const formRef = useRef<HTMLFormElement>(null);
	// Ref pour sauvegarder la valeur avant l'optimistic update (pour rollback si erreur)
	const previousQuantityRef = useRef<number>(currentQuantity);

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCartItem,
			createToastCallbacks({
				showSuccessToast: false, // Désactivé pour éviter le bruit (optimistic UI suffit)
				showErrorToast: true, // Gardé pour informer l'utilisateur des erreurs
			})
		),
		undefined
	);

	const form = useAppForm({
		...cartItemQuantityFormOpts,
		defaultValues: {
			cartItemId,
			quantity: currentQuantity,
		},
		// Merge server state with form state for validation errors
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	// Single useEffect: sync server state OR rollback on error
	useEffect(() => {
		if (state?.status === ActionStatus.ERROR) {
			// 🔴 ROLLBACK : Restaurer la valeur précédente en cas d'erreur serveur
			form.setFieldValue("quantity", previousQuantityRef.current);
		} else {
			// Sync form quantity with currentQuantity (initial mount or after server success)
			form.setFieldValue("quantity", currentQuantity);
			previousQuantityRef.current = currentQuantity;
		}
	}, [currentQuantity, state, form]);

	// Debounced submit to prevent spam (300ms delay)
	// Submit the HTML form directly using requestSubmit()
	const debouncedSubmit = useDebouncedCallback(() => {
		if (formRef.current) {
			formRef.current.requestSubmit();
		}
	}, 300);

	return {
		form,
		formRef,
		action,
		isPending,
		debouncedSubmit,
	};
};
