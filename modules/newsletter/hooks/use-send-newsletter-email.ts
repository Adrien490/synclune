"use client";

import { useActionState } from "react";
import { sendNewsletterEmail } from "@/modules/newsletter/actions/send-newsletter-email";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export function useSendNewsletterEmail() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			sendNewsletterEmail,
			createToastCallbacks({
				loadingMessage: "Envoi de la newsletter...",
			})
		),
		undefined
	);

	return {
		state,
		action,
		isPending,
	};
}
