"use client";

import { markAsPaid } from "@/modules/orders/actions/mark-as-paid";
import { useOrderAction } from "./use-order-action";

interface UseMarkAsPaidOptions {
	onSuccess?: () => void;
}

export function useMarkAsPaid(options?: UseMarkAsPaidOptions) {
	return useOrderAction(markAsPaid, {
		loadingMessage: "Marquage comme payée…",
		onSuccess: options?.onSuccess,
	});
}
