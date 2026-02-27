"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshRefunds } from "@/modules/refunds/actions/refresh-refunds";

interface UseRefreshRefundsOptions {
	onSuccess?: () => void;
}

export function useRefreshRefunds(options?: UseRefreshRefundsOptions) {
	return useRefreshAction(refreshRefunds, {
		onSuccess: options?.onSuccess,
	});
}
