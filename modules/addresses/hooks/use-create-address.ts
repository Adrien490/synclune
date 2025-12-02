"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { createAddress } from "../actions/create-address";

interface UseCreateAddressOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour créer une nouvelle adresse
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 *
 * @example
 * ```tsx
 * const { state, action, isPending } = useCreateAddress({
 *   onSuccess: () => {
 *     router.refresh();
 *   },
 * });
 *
 * return (
 *   <form action={action}>
 *     <input name="street" />
 *     <button disabled={isPending}>Créer</button>
 *   </form>
 * );
 * ```
 */
export const useCreateAddress = (options?: UseCreateAddressOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			createAddress,
			createToastCallbacks({
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
