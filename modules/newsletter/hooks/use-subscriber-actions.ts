"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { unsubscribeSubscriberAdmin } from "@/modules/newsletter/actions/unsubscribe-subscriber-admin";
import { resubscribeSubscriberAdmin } from "@/modules/newsletter/actions/resubscribe-subscriber-admin";
import { resendConfirmationAdmin } from "@/modules/newsletter/actions/resend-confirmation-admin";
import { deleteSubscriberAdmin } from "@/modules/newsletter/actions/delete-subscriber-admin";
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

	const unsubscribe = (subscriberId: string) => {
		startTransition(() =>
			executeWithToast(
				() => unsubscribeSubscriberAdmin(subscriberId),
				"Erreur lors du désabonnement",
				options
			)
		);
	};

	const resubscribe = (subscriberId: string) => {
		startTransition(() =>
			executeWithToast(
				() => resubscribeSubscriberAdmin(subscriberId),
				"Erreur lors du réabonnement",
				options
			)
		);
	};

	const resendConfirmation = (subscriberId: string) => {
		startTransition(() =>
			executeWithToast(
				() => resendConfirmationAdmin(subscriberId),
				"Erreur lors de l'envoi",
				options
			)
		);
	};

	const deleteSubscriber = (subscriberId: string) => {
		startTransition(() =>
			executeWithToast(
				() => deleteSubscriberAdmin(subscriberId),
				"Erreur lors de la suppression",
				options
			)
		);
	};

	return {
		unsubscribe,
		resubscribe,
		resendConfirmation,
		deleteSubscriber,
		isPending,
	};
}
