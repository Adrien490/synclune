import { useActionState } from "react";
import { requestPasswordReset } from "@/modules/auth/actions/request-password-reset";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export function useRequestPasswordReset() {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			requestPasswordReset,
			createToastCallbacks({
				loadingMessage: "Envoi du lien de réinitialisation...",
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
