"use client";

import { markAsFullyRefunded } from "@/modules/orders/actions/mark-as-fully-refunded";
import { useOrderAction } from "./use-order-action";

interface UseMarkAsFullyRefundedOptions {
	onSuccess?: () => void;
}

export function useMarkAsFullyRefunded(options?: UseMarkAsFullyRefundedOptions) {
	return useOrderAction(markAsFullyRefunded, {
		loadingMessage: "Marquage comme remboursée…",
		onSuccess: options?.onSuccess,
	});
}
