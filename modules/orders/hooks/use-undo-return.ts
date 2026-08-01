"use client";

import { undoReturn } from "@/modules/orders/actions/undo-return";
import { useOrderAction } from "./use-order-action";

interface UseUndoReturnOptions {
	onSuccess?: () => void;
}

export function useUndoReturn(options?: UseUndoReturnOptions) {
	return useOrderAction(undoReturn, {
		loadingMessage: "Annulation du retour…",
		onSuccess: options?.onSuccess,
	});
}
