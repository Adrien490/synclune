"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshColors } from "@/modules/colors/actions/refresh-colors";

interface UseRefreshColorsOptions {
	onSuccess?: () => void;
}

export function useRefreshColors(options?: UseRefreshColorsOptions) {
	return useRefreshAction(refreshColors, {
		onSuccess: options?.onSuccess,
	});
}
