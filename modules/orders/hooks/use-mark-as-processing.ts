"use client";

import { markAsProcessing } from "@/modules/orders/actions/mark-as-processing";
import { useOrderAction } from "./use-order-action";

interface UseMarkAsProcessingOptions {
	onSuccess?: () => void;
}

export function useMarkAsProcessing(options?: UseMarkAsProcessingOptions) {
	return useOrderAction(markAsProcessing, {
		loadingMessage: "Marquage en préparation…",
		onSuccess: options?.onSuccess,
	});
}
