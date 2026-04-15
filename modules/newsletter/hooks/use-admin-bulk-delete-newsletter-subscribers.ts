"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { adminBulkDeleteNewsletterSubscribers } from "../actions/admin-bulk-delete-newsletter-subscribers";

interface UseAdminBulkDeleteNewsletterSubscribersOptions {
	onSuccess?: () => void;
}

export function useAdminBulkDeleteNewsletterSubscribers(
	options?: UseAdminBulkDeleteNewsletterSubscribersOptions,
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			adminBulkDeleteNewsletterSubscribers,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
