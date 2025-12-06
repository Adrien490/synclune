"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { invalidateUserSessions } from "@/modules/users/actions/admin/invalidate-user-sessions";
import { ActionStatus } from "@/shared/types/server-action";

interface UseInvalidateUserSessionsOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour forcer la déconnexion d'un utilisateur
 */
export function useInvalidateUserSessions(options?: UseInvalidateUserSessionsOptions) {
	const [isPending, startTransition] = useTransition();

	const invalidate = (userId: string, userName: string) => {
		startTransition(async () => {
			const toastId = toast.loading(`Déconnexion de ${userName}...`);

			try {
				const result = await invalidateUserSessions(userId);

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
					error instanceof Error ? error.message : "Erreur lors de la déconnexion";
				toast.error(message);
				options?.onError?.(message);
			}
		});
	};

	return {
		invalidate,
		isPending,
	};
}
