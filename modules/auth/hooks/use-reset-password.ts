import { ActionStatus } from "@/shared/types/server-action";
import { useActionState } from "react";
import { resetPassword } from "@/modules/auth/actions/reset-password";

export function useResetPassword() {
	const [state, action, isPending] = useActionState(resetPassword, {
		status: ActionStatus.INITIAL,
		message: "",
	});

	return {
		state,
		action,
		isPending,
	};
}
