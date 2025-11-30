import { ActionStatus } from "@/shared/types/server-action";
import { useActionState } from "react";
import { sendNewsletterEmail } from "@/modules/newsletter/actions/send-newsletter-email";

export function useSendNewsletterEmail() {
	const [state, action, isPending] = useActionState(sendNewsletterEmail, {
		status: ActionStatus.INITIAL,
		message: "",
	});

	return {
		state,
		action,
		isPending,
	};
}
