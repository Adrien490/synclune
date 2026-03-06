"use client";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState } from "react";
import { requestEmailChange } from "@/modules/users/actions/request-email-change";

interface UseRequestEmailChangeOptions {
	onSuccess?: (message: string) => void;
}

export const useRequestEmailChange = (options?: UseRequestEmailChangeOptions) => {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			requestEmailChange,
			createToastCallbacks({
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"message" in result &&
						typeof result.message === "string"
					) {
						options?.onSuccess?.(result.message);
					}
				},
			}),
		),
		undefined,
	);

	return { state, action, isPending };
};
