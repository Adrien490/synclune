"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { updateAddress } from "@/modules/users/actions/update-address";

interface UseUpdateAddressOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour mettre à jour une adresse existante
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 *
 * @example
 * ```tsx
 * const { state, action, isPending } = useUpdateAddress(addressId, {
 *   onSuccess: () => {
 *     router.refresh();
 *   },
 * });
 *
 * return (
 *   <form action={action}>
 *     <input name="street" />
 *     <button disabled={isPending}>Mettre à jour</button>
 *   </form>
 * );
 * ```
 */
export const useUpdateAddress = (
	addressId: string,
	options?: UseUpdateAddressOptions
) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateAddress.bind(null, addressId),
			createToastCallbacks({
				loadingMessage: "Mise à jour de l'adresse...",
				showErrorToast: false,
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

	return {
		state,
		action,
		isPending,
	};
};
