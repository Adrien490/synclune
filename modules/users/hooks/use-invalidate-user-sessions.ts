"use client";

import { useActionState, useTransition } from "react";
import { invalidateUserSessions } from "@/modules/users/actions/admin/invalidate-user-sessions";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

interface UseInvalidateUserSessionsOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour forcer la déconnexion d'un utilisateur
 */
export function useInvalidateUserSessions(
	options?: UseInvalidateUserSessionsOptions
) {
	const [isPending, startTransition] = useTransition();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				invalidateUserSessions(formData.get("userId") as string),
			createToastCallbacks({
				loadingMessage: "Déconnexion en cours...",
				onSuccess: () => {
					options?.onSuccess?.();
				},
				onError: (result) => {
					if (result.message) {
						options?.onError?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const invalidate = (userId: string, _userName: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("userId", userId);
			formAction(formData);
		});
	};

	return {
		invalidate,
		isPending: isPending || isActionPending,
	};
}
