"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";
import { deleteAddress } from "../actions/delete-address";

interface UseDeleteAddressOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour supprimer une adresse
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 * et useTransition pour la méthode handle
 *
 * @example
 * ```tsx
 * const { state, action, isPending, handle } = useDeleteAddress({
 *   onSuccess: () => {
 *     router.refresh();
 *   },
 * });
 *
 * // Utilisation avec un form
 * return <form action={action}>...</form>
 *
 * // Utilisation programmatique
 * return (
 *   <button onClick={() => handle(addressId)} disabled={isPending}>
 *     Supprimer
 *   </button>
 * );
 * ```
 */
export const useDeleteAddress = (options?: UseDeleteAddressOptions) => {
	const [state, formAction, isFormPending] = useActionState(
		withCallbacks(
			deleteAddress,
			createToastCallbacks({
				loadingMessage: "Suppression de l'adresse...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const [isTransitionPending, startTransition] = useTransition();

	/**
	 * Méthode utilitaire pour appeler l'action programmatiquement
	 * @param addressId L'ID de l'adresse à supprimer
	 */
	const handle = (addressId: string) => {
		const formData = new FormData();
		formData.append("addressId", addressId);
		startTransition(() => {
			formAction(formData);
		});
	};

	return {
		state,
		action: formAction,
		isPending: isFormPending || isTransitionPending,
		handle,
	};
};
