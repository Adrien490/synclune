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
	errorFallback: string,
	options?: UseSubscriberActionsOptions
): Promise<void> {
	try {
		const result = await action();

		if (result.status === ActionStatus.SUCCESS) {
			toast.success(result.message);
			options?.onSuccess?.();
		} else {
			toast.error(result.message);
			options?.onError?.(result.message);
		}
	} catch (error) {
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

	// Extraire les callbacks en variables stables pour éviter les re-renders
	const onSuccess = options?.onSuccess;
	const onError = options?.onError;

	const unsubscribe = useCallback(
		(subscriberId: string) => {
			startTransition(() =>
				executeWithToast(
					() => unsubscribeSubscriberAdmin(subscriberId),
					"Erreur lors du désabonnement",
					{ onSuccess, onError }
				)
			);
		},
		[onSuccess, onError]
	);

	const resubscribe = useCallback(
		(subscriberId: string) => {
			startTransition(() =>
				executeWithToast(
					() => resubscribeSubscriberAdmin(subscriberId),
					"Erreur lors du réabonnement",
					{ onSuccess, onError }
				)
			);
		},
		[onSuccess, onError]
	);

	const resendConfirmation = useCallback(
		(subscriberId: string) => {
			startTransition(() =>
				executeWithToast(
					() => resendConfirmationAdmin(subscriberId),
					"Erreur lors de l'envoi",
					{ onSuccess, onError }
				)
			);
		},
		[onSuccess, onError]
	);

	const deleteSubscriber = useCallback(
		(subscriberId: string) => {
			startTransition(() =>
				executeWithToast(
					() => deleteSubscriberAdmin(subscriberId),
					"Erreur lors de la suppression",
					{ onSuccess, onError }
				)
			);
		},
		[onSuccess, onError]
	);

	return {
		unsubscribe,
		resubscribe,
		resendConfirmation,
		deleteSubscriber,
		isPending,
	};
}
