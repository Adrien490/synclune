"use client";

import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { cleanupExpiredNotificationsAction } from "@/modules/stock-notifications/actions/cleanup-expired-notifications";

export function useCleanupExpiredNotifications() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			cleanupExpiredNotificationsAction,
			createToastCallbacks({
				loadingMessage: "Nettoyage des demandes expirées...",
			})
		),
		undefined
	);

	return { state, action, isPending };
}
