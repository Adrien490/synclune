"use client";

import { useActionState, useTransition } from "react";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import type { ActionState } from "@/shared/types/server-action";
import type { CreateToastCallbacksOptions } from "@/shared/types/callback.types";

type ServerAction = (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;

interface UseActionWithToastOptions {
	onSuccess?: (result: ActionState) => void;
	onError?: (result: ActionState) => void;
	toastOptions?: Omit<CreateToastCallbacksOptions, "onSuccess" | "onError">;
}

/**
 * Generic hook that wraps a server action with toast notifications.
 *
 * Replaces the repetitive use-delete-* and use-refresh-* hooks pattern.
 *
 * @example
 * ```tsx
 * const { action, isPending } = useActionWithToast(deleteProduct, {
 *   onSuccess: () => router.refresh(),
 * });
 * ```
 */
export function useActionWithToast(
	serverAction: ServerAction,
	options?: UseActionWithToastOptions,
) {
	const [state, action, isPending] = useActionState(
		withCallbacks(
			serverAction,
			createToastCallbacks({
				...options?.toastOptions,
				onSuccess: options?.onSuccess,
				onError: options?.onError,
			}),
		),
		undefined,
	);

	return { state, action, isPending };
}

interface UseRefreshActionOptions {
	onSuccess?: () => void;
	params?: Record<string, string>;
}

/**
 * Generic hook for refresh/cache-invalidation actions.
 *
 * Wraps the action in a transition and provides a `refresh()` helper.
 *
 * @example
 * ```tsx
 * const { refresh, isPending } = useRefreshAction(refreshProducts, {
 *   onSuccess: () => console.log("refreshed"),
 * });
 * ```
 */
export function useRefreshAction(serverAction: ServerAction, options?: UseRefreshActionOptions) {
	const [isTransitionPending, startTransition] = useTransition();

	const [state, action, isPending] = useActionState(
		withCallbacks(
			serverAction,
			createToastCallbacks({
				showSuccessToast: false,
				onSuccess: () => options?.onSuccess?.(),
			}),
		),
		undefined,
	);

	const refresh = () => {
		startTransition(() => {
			const formData = new FormData();
			if (options?.params) {
				for (const [key, value] of Object.entries(options.params)) {
					formData.append(key, value);
				}
			}
			action(formData);
		});
	};

	return {
		state,
		action,
		isPending: isPending || isTransitionPending,
		refresh,
	};
}
