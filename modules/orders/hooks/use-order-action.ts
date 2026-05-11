"use client";

import { useActionState } from "react";
import type { ActionState } from "@/shared/types/server-action";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

type OrderAction = (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;

interface UseOrderActionOptions {
	loadingMessage: string;
	onSuccess?: () => void;
}

/**
 * Factory hook wiring `useActionState` + toast callbacks for orders state-transition actions.
 *
 * Used by simple state-transition hooks (cancel, mark-as-paid, mark-as-delivered, etc.)
 * to avoid duplicating ~12 LOC of boilerplate per action. TanStack-form-based hooks
 * (`use-mark-as-shipped-form`, `use-update-tracking-form`) intentionally remain explicit
 * because they thread the resulting state through `mergeForm`.
 */
export function useOrderAction(action: OrderAction, options: UseOrderActionOptions) {
	const [state, formAction, isPending] = useActionState(
		withCallbacks(
			action,
			createToastCallbacks({
				loadingMessage: options.loadingMessage,
				onSuccess: () => options.onSuccess?.(),
			}),
		),
		undefined,
	);

	return { state, action: formAction, isPending };
}
