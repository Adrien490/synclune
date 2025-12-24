"use client";

import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { subscribeToStockNotification } from "@/modules/stock-notifications/actions/subscribe-to-stock-notification";

interface UseSubscribeToStockNotificationOptions {
	onSuccess?: () => void;
	onError?: () => void;
}

/**
 * Hook pour s'inscrire aux notifications de retour en stock
 * Compatible avec useActionState de React 19
 * Utilise withCallbacks pour gérer les callbacks succès/erreur
 */
export function useSubscribeToStockNotification(
	options?: UseSubscribeToStockNotificationOptions
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			subscribeToStockNotification,
			createToastCallbacks({
				showSuccessToast: false,
				showErrorToast: false,
				onSuccess: () => {
					options?.onSuccess?.();
				},
				onError: () => {
					options?.onError?.();
				},
			})
		),
		undefined
	);

	return { state, action, isPending };
}
