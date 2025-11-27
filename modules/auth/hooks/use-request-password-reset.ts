import { ActionStatus } from "@/shared/types/server-action";
import { useActionState } from "react";
import { requestPasswordReset } from "@/modules/auth/actions/request-password-reset";

export function useRequestPasswordReset() {
	const [state, action, isPending] = useActionState(requestPasswordReset, {
		status: ActionStatus.INITIAL,
		message: "",
	});

	return {
		state,
		action,
		isPending,
	};
}
