"use client";

import { useActionState, useTransition } from "react";
import { unsubscribeSubscriberAdmin } from "@/modules/newsletter/actions/unsubscribe-subscriber-admin";
import { resubscribeSubscriberAdmin } from "@/modules/newsletter/actions/resubscribe-subscriber-admin";
import { resendConfirmationAdmin } from "@/modules/newsletter/actions/resend-confirmation-admin";
import { deleteSubscriberAdmin } from "@/modules/newsletter/actions/delete-subscriber-admin";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { ActionState } from "@/shared/types/server-action";

interface UseSubscriberActionsOptions {
	onSuccess?: () => void;
	onError?: (message: string) => void;
}

/**
 * Hook admin pour les actions sur les abonnés newsletter
 */
export function useSubscriberActions(options?: UseSubscriberActionsOptions) {
	const [isPending, startTransition] = useTransition();

	const callbacks = createToastCallbacks({
		onSuccess: () => {
			options?.onSuccess?.();
		},
		onError: (result) => {
			if (result.message) {
				options?.onError?.(result.message);
			}
		},
	});

	const [, unsubscribeAction, isUnsubscribePending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				unsubscribeSubscriberAdmin(formData.get("subscriberId") as string),
			callbacks
		),
		undefined
	);

	const [, resubscribeAction, isResubscribePending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				resubscribeSubscriberAdmin(formData.get("subscriberId") as string),
			callbacks
		),
		undefined
	);

	const [, resendAction, isResendPending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				resendConfirmationAdmin(formData.get("subscriberId") as string),
			callbacks
		),
		undefined
	);

	const [, deleteAction, isDeletePending] = useActionState(
		withCallbacks(
			async (_prev: ActionState | undefined, formData: FormData) =>
				deleteSubscriberAdmin(formData.get("subscriberId") as string),
			callbacks
		),
		undefined
	);

	const unsubscribe = (subscriberId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("subscriberId", subscriberId);
			unsubscribeAction(formData);
		});
	};

	const resubscribe = (subscriberId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("subscriberId", subscriberId);
			resubscribeAction(formData);
		});
	};

	const resendConfirmation = (subscriberId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("subscriberId", subscriberId);
			resendAction(formData);
		});
	};

	const deleteSubscriber = (subscriberId: string) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("subscriberId", subscriberId);
			deleteAction(formData);
		});
	};

	return {
		unsubscribe,
		resubscribe,
		resendConfirmation,
		deleteSubscriber,
		isPending:
			isPending ||
			isUnsubscribePending ||
			isResubscribePending ||
			isResendPending ||
			isDeletePending,
	};
}
