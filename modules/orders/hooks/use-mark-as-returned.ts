"use client";

import { markAsReturned } from "@/modules/orders/actions/mark-as-returned";
import { useOrderAction } from "./use-order-action";

interface UseMarkAsReturnedOptions {
	onSuccess?: () => void;
}

export function useMarkAsReturned(options?: UseMarkAsReturnedOptions) {
	return useOrderAction(markAsReturned, {
		loadingMessage: "Marquage comme retournée…",
		onSuccess: options?.onSuccess,
	});
}
