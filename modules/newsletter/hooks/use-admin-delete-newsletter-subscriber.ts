"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { adminDeleteNewsletterSubscriber } from "../actions/admin-delete-newsletter-subscriber";

interface UseAdminDeleteNewsletterSubscriberOptions {
	onSuccess?: () => void;
}

export function useAdminDeleteNewsletterSubscriber(
	options?: UseAdminDeleteNewsletterSubscriberOptions,
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			adminDeleteNewsletterSubscriber,
			createToastCallbacks({
				loadingMessage: "Suppression en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
