import { ActionStatus } from "@/shared/types/server-action";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { changePassword } from "../actions/change-password";

export function useChangePassword(onOpenChange?: (open: boolean) => void) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			changePassword,
			createToastCallbacks({
				onSuccess: () => {
					if (onOpenChange) {
						setTimeout(() => {
							onOpenChange(false);
						}, 2000);
					}
				},
			})
		),
		{
			status: ActionStatus.INITIAL,
			message: "",
		}
	);

	return {
		state,
		action,
		isPending,
	};
}
