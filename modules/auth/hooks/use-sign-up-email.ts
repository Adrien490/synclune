import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { signUpEmail } from "@/modules/auth/actions/sign-up-email";

interface UseSignUpEmailOptions {
	onSuccess?: (message: string) => void;
}

export function useSignUpEmail(options?: UseSignUpEmailOptions) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			signUpEmail,
			createToastCallbacks({
				showSuccessToast: false, // Pas de toast - on utilise le dialog
				showErrorToast: false, // Afficher les erreurs
				onSuccess: (result: unknown) => {
					// Appeler le callback personnalisé de succès si fourni
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

	return {
		state,
		action,
		isPending,
	};
}
