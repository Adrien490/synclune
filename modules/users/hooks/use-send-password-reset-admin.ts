"use client";

import { useActionState, useTransition } from "react";
import { sendPasswordResetAdmin } from "@/modules/users/actions/admin/send-password-reset-admin";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

interface UseSendPasswordResetAdminOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour envoyer un email de réinitialisation de mot de passe
 */
export function useSendPasswordResetAdmin(
	options?: UseSendPasswordResetAdminOptions
) {
	const [isPending, startTransition] = useTransition();

	const [, formAction, isActionPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				sendPasswordResetAdmin(formData.get("userId") as string),
			createToastCallbacks({
				loadingMessage: "Envoi de l'email...",
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

	const sendReset = (userId: string, _userName: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("userId", userId);
			formAction(formData);
		});
	};

	return {
		sendReset,
		isPending: isPending || isActionPending,
	};
}
