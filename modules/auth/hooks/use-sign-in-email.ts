import { ActionStatus } from "@/shared/types/server-action";
import { useActionState } from "react";
import { signInEmail } from "@/modules/auth/actions/sign-in-email";

export function useSignInEmail() {
	const [state, action, isPending] = useActionState(signInEmail, {
		status: ActionStatus.INITIAL,
		message: "",
	});

	return {
		state,
		action,
		isPending,
	};
}
