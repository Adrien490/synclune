"use client";

import { useActionState, useTransition } from "react";

import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import type { CreateToastCallbacksOptions } from "@/shared/types/callback.types";
import type { ActionState } from "@/shared/types/server-action";
import { withCallbacks } from "@/shared/utils/with-callbacks";

type ServerAction = (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;

interface UseActionStateWithToastOptions<TData> {
	loadingMessage: string;
	showSuccessToast?: boolean;
	/**
	 * Type guard / extractor : transforme `ActionState["data"]` en `TData | null`.
	 * Si non fourni, `null` est passé à `onSuccess`.
	 */
	extractData?: (result: ActionState) => TData | null;
	onSuccess?: (message: string, data: TData | null) => void;
	onError?: () => void;
	/**
	 * Wrappe l'invocation dans un `useTransition`. Activé par défaut (`true`) car
	 * la plupart des hooks consommateurs (duplicate/merge/...) le veulent.
	 * Mettre à `false` quand l'appelant gère son propre `startTransition`
	 * (cas `useOptimistic` côté toggle).
	 */
	useOwnTransition?: boolean;
}

/**
 * Wrapper réutilisable autour de `useActionState` + toast callbacks +
 * narrowing typé. Remplace les patterns dupliqués dans
 * `use-duplicate-product-type`, `use-merge-product-types`,
 * `use-toggle-product-type-status` (et leurs jumeaux `colors/`, `materials/`).
 *
 * @example
 * const { state, action, isPending } = useActionStateWithToast(duplicateProductType, {
 *   loadingMessage: "Duplication du type…",
 *   showSuccessToast: false,
 *   extractData: (r) => isDuplicateData(r.data) ? r.data : null,
 *   onSuccess: (msg, data) => data && options?.onSuccess?.(msg, data),
 * });
 */
export function useActionStateWithToast<TData = unknown>(
	serverAction: ServerAction,
	options: UseActionStateWithToastOptions<TData>,
) {
	const useOwnTransition = options.useOwnTransition ?? true;
	const [isTransitionPending, startTransition] = useTransition();

	const toastOptions: CreateToastCallbacksOptions = {
		loadingMessage: options.loadingMessage,
		...(options.showSuccessToast !== undefined && { showSuccessToast: options.showSuccessToast }),
		onSuccess: (result) => {
			if (!options.onSuccess) return;
			const message = typeof result.message === "string" ? result.message : "";
			const data = options.extractData ? options.extractData(result) : null;
			options.onSuccess(message, data);
		},
		...(options.onError && { onError: options.onError }),
	};

	const [state, action, isPending] = useActionState(
		withCallbacks(serverAction, createToastCallbacks(toastOptions)),
		undefined,
	);

	const wrappedAction = useOwnTransition
		? (formData: FormData) => startTransition(() => action(formData))
		: action;

	return {
		state,
		action: wrappedAction,
		rawAction: action,
		isPending: isPending || (useOwnTransition && isTransitionPending),
	};
}
