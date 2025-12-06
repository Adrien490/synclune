"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendPasswordResetAdmin } from "@/modules/users/actions/admin/send-password-reset-admin";
import { ActionStatus } from "@/shared/types/server-action";

interface UseSendPasswordResetAdminOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour envoyer un email de réinitialisation de mot de passe
 */
export function useSendPasswordResetAdmin(options?: UseSendPasswordResetAdminOptions) {
	const [isPending, startTransition] = useTransition();

	const sendReset = (userId: string, userName: string) => {
		startTransition(async () => {
			const toastId = toast.loading(`Envoi de l'email à ${userName}...`);

			try {
				const result = await sendPasswordResetAdmin(userId);

				toast.dismiss(toastId);

				if (result.status === ActionStatus.SUCCESS) {
					toast.success(result.message);
					options?.onSuccess?.();
				} else {
					toast.error(result.message);
					options?.onError?.(result.message);
				}
			} catch (error) {
				toast.dismiss(toastId);
				const message =
					error instanceof Error ? error.message : "Erreur lors de l'envoi de l'email";
				toast.error(message);
				options?.onError?.(message);
			}
		});
	};

	return {
		sendReset,
		isPending,
	};
}
