"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshProductTypes } from "@/modules/product-types/actions/refresh-product-types";

interface UseRefreshProductTypesOptions {
	onSuccess?: () => void;
}

export function useRefreshProductTypes(options?: UseRefreshProductTypesOptions) {
	return useRefreshAction(refreshProductTypes, {
		onSuccess: options?.onSuccess,
	});
}
