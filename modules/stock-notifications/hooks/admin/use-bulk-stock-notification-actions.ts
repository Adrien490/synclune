"use client";

import { bulkCancelStockNotifications } from "@/modules/stock-notifications/actions/bulk-cancel-stock-notifications";
import { bulkDeleteStockNotifications } from "@/modules/stock-notifications/actions/bulk-delete-stock-notifications";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { useActionState, useTransition } from "react";

interface UseBulkStockNotificationActionsOptions {
	onSuccess?: (message: string) => void;
}

export function useBulkCancelStockNotifications(options?: UseBulkStockNotificationActionsOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkCancelStockNotifications,
			createToastCallbacks({
				loadingMessage: "Annulation en cours...",
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

	const cancel = (notificationIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(notificationIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		cancel,
	};
}

export function useBulkDeleteStockNotifications(options?: UseBulkStockNotificationActionsOptions) {
	const [isTransitionPending, startTransition] = useTransition();
	const [state, action, isPending] = useActionState(
		withCallbacks(
			bulkDeleteStockNotifications,
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

	const deleteNotifications = (notificationIds: string[]) => {
		startTransition(() => {
			const formData = new FormData();
			formData.append("ids", JSON.stringify(notificationIds));
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		deleteNotifications,
	};
}
