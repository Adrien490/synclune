"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { unsubscribeSubscriberAdmin } from "@/modules/newsletter/actions/admin/unsubscribe-subscriber-admin";
import { resubscribeSubscriberAdmin } from "@/modules/newsletter/actions/admin/resubscribe-subscriber-admin";
import { resendConfirmationAdmin } from "@/modules/newsletter/actions/admin/resend-confirmation-admin";
import { deleteSubscriberAdmin } from "@/modules/newsletter/actions/admin/delete-subscriber-admin";
import { ActionState, ActionStatus } from "@/shared/types/server-action";

interface UseSubscriberActionsOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Helper interne pour exécuter une action admin avec gestion des toasts
 */
async function executeWithToast(
	action: () => Promise<ActionState>,
	loadingMessage: string,
	errorFallback: string,
	options?: UseSubscriberActionsOptions
): Promise<void> {
	const toastId = toast.loading(loadingMessage);

	try {
		const result = await action();
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
		const message = error instanceof Error ? error.message : errorFallback;
		toast.error(message);
		options?.onError?.(message);
	}
}

/**
 * Hook admin pour les actions sur les abonnés newsletter
 */
export function useSubscriberActions(options?: UseSubscriberActionsOptions) {
	const [isPending, startTransition] = useTransition();

	const unsubscribe = useCallback(
		(subscriberId: string, email: string) => {
			startTransition(() =>
				executeWithToast(
					() => unsubscribeSubscriberAdmin(subscriberId),
					`Désabonnement de ${email}...`,
					"Erreur lors du désabonnement",
					options
				)
			);
		},
		[options]
	);

	const resubscribe = useCallback(
		(subscriberId: string, email: string) => {
			startTransition(() =>
				executeWithToast(
					() => resubscribeSubscriberAdmin(subscriberId),
					`Réabonnement de ${email}...`,
					"Erreur lors du réabonnement",
					options
				)
			);
		},
		[options]
	);

	const resendConfirmation = useCallback(
		(subscriberId: string, email: string) => {
			startTransition(() =>
				executeWithToast(
					() => resendConfirmationAdmin(subscriberId),
					`Envoi de l'email à ${email}...`,
					"Erreur lors de l'envoi",
					options
				)
			);
		},
		[options]
	);

	const deleteSubscriber = useCallback(
		(subscriberId: string, email: string) => {
			startTransition(() =>
				executeWithToast(
					() => deleteSubscriberAdmin(subscriberId),
					`Suppression de ${email}...`,
					"Erreur lors de la suppression",
					options
				)
			);
		},
		[options]
	);

	return {
		unsubscribe,
		resubscribe,
		resendConfirmation,
		deleteSubscriber,
		isPending,
	};
}
