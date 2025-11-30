"use client";

import { useTransition, useCallback } from "react";
import { toast } from "sonner";
import { unsubscribeSubscriberAdmin } from "@/modules/newsletter/actions/admin/unsubscribe-subscriber-admin";
import { resubscribeSubscriberAdmin } from "@/modules/newsletter/actions/admin/resubscribe-subscriber-admin";
import { resendConfirmationAdmin } from "@/modules/newsletter/actions/admin/resend-confirmation-admin";
import { deleteSubscriberAdmin } from "@/modules/newsletter/actions/admin/delete-subscriber-admin";
import { ActionStatus } from "@/shared/types/server-action";

interface UseSubscriberActionsOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour les actions sur les abonnés newsletter
 */
export function useSubscriberActions(options?: UseSubscriberActionsOptions) {
	const [isPending, startTransition] = useTransition();

	const unsubscribe = useCallback(
		(subscriberId: string, email: string) => {
			startTransition(async () => {
				const toastId = toast.loading(`Désabonnement de ${email}...`);

				try {
					const result = await unsubscribeSubscriberAdmin(subscriberId);
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
					const message = error instanceof Error ? error.message : "Erreur lors du désabonnement";
					toast.error(message);
					options?.onError?.(message);
				}
			});
		},
		[options]
	);

	const resubscribe = useCallback(
		(subscriberId: string, email: string) => {
			startTransition(async () => {
				const toastId = toast.loading(`Réabonnement de ${email}...`);

				try {
					const result = await resubscribeSubscriberAdmin(subscriberId);
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
					const message = error instanceof Error ? error.message : "Erreur lors du réabonnement";
					toast.error(message);
					options?.onError?.(message);
				}
			});
		},
		[options]
	);

	const resendConfirmation = useCallback(
		(subscriberId: string, email: string) => {
			startTransition(async () => {
				const toastId = toast.loading(`Envoi de l'email à ${email}...`);

				try {
					const result = await resendConfirmationAdmin(subscriberId);
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
					const message = error instanceof Error ? error.message : "Erreur lors de l'envoi";
					toast.error(message);
					options?.onError?.(message);
				}
			});
		},
		[options]
	);

	const deleteSubscriber = useCallback(
		(subscriberId: string, email: string) => {
			startTransition(async () => {
				const toastId = toast.loading(`Suppression de ${email}...`);

				try {
					const result = await deleteSubscriberAdmin(subscriberId);
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
					const message = error instanceof Error ? error.message : "Erreur lors de la suppression";
					toast.error(message);
					options?.onError?.(message);
				}
			});
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
