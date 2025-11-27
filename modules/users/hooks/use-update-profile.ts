"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState } from "react";
import { updateProfile } from "@/modules/users/actions/update-profile";

interface UseUpdateProfileOptions {
	onSuccess?: (message: string) => void;
}

/**
 * Hook pour mettre à jour le profil utilisateur
 * Utilise useActionState avec withCallbacks pour la gestion du toast
 *
 * @example
 * ```tsx
 * const { state, action, isPending } = useUpdateProfile({
 *   onSuccess: () => {
 *     router.refresh();
 *   },
 * });
 *
 * return (
 *   <form action={action}>
 *     <input name="name" />
 *     <input name="email" />
 *     <button disabled={isPending}>Enregistrer</button>
 *   </form>
 * );
 * ```
 */
export const useUpdateProfile = (options?: UseUpdateProfileOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateProfile,
			createToastCallbacks({
				loadingMessage: "Mise à jour du profil...",
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
