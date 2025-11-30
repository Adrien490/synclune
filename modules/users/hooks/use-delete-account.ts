"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/modules/users/actions/delete-account";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface UseDeleteAccountOptions {
	onSuccess?: () => void;
}

/**
 * Hook pour supprimer le compte utilisateur (RGPD - Droit à l'oubli)
 *
 * @example
 * ```tsx
 * const { state, action, isPending } = useDeleteAccount({
 *   onSuccess: () => {
 *     // Redirection gérée automatiquement
 *   },
 * });
 *
 * return (
 *   <form action={action}>
 *     <button disabled={isPending}>Supprimer mon compte</button>
 *   </form>
 * );
 * ```
 */
export function useDeleteAccount(options?: UseDeleteAccountOptions) {
	const router = useRouter();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			deleteAccount,
			createToastCallbacks({
				loadingMessage: "Suppression du compte...",
				onSuccess: () => {
					options?.onSuccess?.();
					// Rediriger vers la page d'accueil après suppression
					router.push("/");
					router.refresh();
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
}
