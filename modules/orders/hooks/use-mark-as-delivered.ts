"use client";

import { markAsDelivered } from "@/modules/orders/actions/mark-as-delivered";
import { useOrderAction } from "./use-order-action";

interface UseMarkAsDeliveredOptions {
	onSuccess?: () => void;
}

export function useMarkAsDelivered(options?: UseMarkAsDeliveredOptions) {
	return useOrderAction(markAsDelivered, {
		loadingMessage: "Marquage comme livrée…",
		onSuccess: options?.onSuccess,
	});
}
