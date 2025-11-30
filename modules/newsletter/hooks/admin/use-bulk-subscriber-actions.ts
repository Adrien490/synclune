"use client";

import { bulkUnsubscribeSubscribers } from "@/modules/newsletter/actions/admin/bulk-unsubscribe-subscribers";
import { bulkResubscribeSubscribers } from "@/modules/newsletter/actions/admin/bulk-resubscribe-subscribers";
import { bulkDeleteSubscribers } from "@/modules/newsletter/actions/admin/bulk-delete-subscribers";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useTransition } from "react";

interface UseBulkSubscriberActionsOptions {
	onSuccess?: (message: string) => void;
}

export function useBulkUnsubscribeSubscribers(options?: UseBulkSubscriberActionsOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkUnsubscribeSubscribers,
			createToastCallbacks({
				loadingMessage: "Désabonnement en cours...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const unsubscribe = (subscriberIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(subscriberIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		unsubscribe,
	};
}

export function useBulkResubscribeSubscribers(options?: UseBulkSubscriberActionsOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkResubscribeSubscribers,
			createToastCallbacks({
				loadingMessage: "Réabonnement en cours...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const resubscribe = (subscriberIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(subscriberIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		resubscribe,
	};
}

export function useBulkDeleteSubscribers(options?: UseBulkSubscriberActionsOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeleteSubscribers,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			})
		),
		undefined
	);

	const deleteSubscribers = (subscriberIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(subscriberIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		deleteSubscribers,
	};
}
