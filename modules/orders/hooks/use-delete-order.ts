"use client";

import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";
import { deleteOrder } from "@/modules/orders/actions/delete-order";

interface UseDeleteOrderOptions {
	onSuccess?: () => void;
}

export function useDeleteOrder(options?: UseDeleteOrderOptions) {
	return useActionWithToast(deleteOrder, {
		onSuccess: () => options?.onSuccess?.(),
	});
}
