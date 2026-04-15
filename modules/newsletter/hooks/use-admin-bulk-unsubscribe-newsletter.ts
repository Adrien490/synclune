"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { adminBulkUnsubscribeNewsletter } from "../actions/admin-bulk-unsubscribe-newsletter";

interface UseAdminBulkUnsubscribeNewsletterOptions {
	onSuccess?: () => void;
}

export function useAdminBulkUnsubscribeNewsletter(
	options?: UseAdminBulkUnsubscribeNewsletterOptions,
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			adminBulkUnsubscribeNewsletter,
			createToastCallbacks({
				loadingMessage: "Désabonnement en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
