"use client";

import { useActionState, useTransition } from "react";
import { unsubscribeSubscriberAdmin } from "@/modules/newsletter/actions/unsubscribe-subscriber-admin";
import { resubscribeSubscriberAdmin } from "@/modules/newsletter/actions/resubscribe-subscriber-admin";
import { resendConfirmationAdmin } from "@/modules/newsletter/actions/resend-confirmation-admin";
import { deleteSubscriberAdmin } from "@/modules/newsletter/actions/delete-subscriber-admin";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

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

	const [, unsubscribeAction] = useActionState(
		withCallbacks(unsubscribeSubscriberAdmin, callbacks),
		undefined
	);

	const [, resubscribeAction] = useActionState(
		withCallbacks(resubscribeSubscriberAdmin, callbacks),
		undefined
	);

	const [, resendAction] = useActionState(
		withCallbacks(resendConfirmationAdmin, callbacks),
		undefined
	);

	const [, deleteAction] = useActionState(
		withCallbacks(deleteSubscriberAdmin, callbacks),
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
		isPending,
	};
}
