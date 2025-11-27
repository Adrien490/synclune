import { ActionState } from "@/shared/types/server-action";
import { toast } from "sonner";

type CreateToastCallbacksOptions<T = ActionState> = {
	loadingMessage?: string;
	showSuccessToast?: boolean;
	showErrorToast?: boolean;
	onSuccess?: (result: T) => void;
	onError?: (result: T) => void;
	/**
	 * Action button configuration for success toasts
	 * Uses Sonner's recommended object format
	 * Example: { label: 'Voir le panier', onClick: () => router.push('/cart') }
	 */
	successAction?: {
		label: string;
		onClick: () => void;
	};
};

/**
 * Type guard to check if a value is an ActionState with a message
 */
const hasMessage = (
	value: unknown
): value is { message: string; [key: string]: unknown } => {
	return (
		value !== null &&
		typeof value === "object" &&
		"message" in value &&
		typeof (value as { message: unknown }).message === "string" &&
		Boolean((value as { message: string }).message)
	);
};

/**
 * Creates callbacks for handling toast notifications in server actions
 * @param options Configuration options for the toast callbacks
 * @returns An object with onStart, onEnd, onSuccess, and onError callbacks
 */
export const createToastCallbacks = <
	T extends ActionState | unknown = ActionState,
>(
	options: CreateToastCallbacksOptions<T> = {}
) => {
	const {
		loadingMessage,
		showSuccessToast = true,
		showErrorToast = true,
		onSuccess: customOnSuccess,
		onError: customOnError,
		successAction,
	} = options;

	return {
		onStart: () => {
			if (loadingMessage) {
				return toast.loading(loadingMessage);
			}
			return undefined;
		},
		onEnd: (reference: string | number | undefined) => {
			if (reference !== undefined) {
				toast.dismiss(reference);
			}
		},
		onSuccess: (result: T) => {
			// Call custom success callback if provided
			customOnSuccess?.(result);

			// Default toast behavior
			if (showSuccessToast && hasMessage(result)) {
				// Use Sonner's recommended object format for action
				if (successAction) {
					toast.success(result.message, {
						action: successAction,
					});
				} else {
					toast.success(result.message);
				}
			}
		},
		onError: (result: T) => {
			// Call custom error callback if provided
			customOnError?.(result);

			// Default toast behavior
			if (showErrorToast && hasMessage(result)) {
				toast.error(result.message);
			}
		},
	};
};
