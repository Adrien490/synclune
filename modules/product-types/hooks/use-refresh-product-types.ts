"use client";

import { refreshProductTypes } from "@/modules/product-types/actions/refresh-product-types";
import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";

export function useRefreshProductTypes(options?: { onSuccess?: () => void }) {
	return useRefreshAction(refreshProductTypes, options);
}
