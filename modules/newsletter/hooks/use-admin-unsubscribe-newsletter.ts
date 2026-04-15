"use client";

import { useActionState } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { adminUnsubscribeNewsletter } from "../actions/admin-unsubscribe-newsletter";

interface UseAdminUnsubscribeNewsletterOptions {
	onSuccess?: () => void;
}

export function useAdminUnsubscribeNewsletter(options?: UseAdminUnsubscribeNewsletterOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			adminUnsubscribeNewsletter,
			createToastCallbacks({
				loadingMessage: "Désabonnement en cours...",
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}
