"use client";

import { refreshColors } from "@/modules/colors/actions/refresh-colors";
import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";

export function useRefreshColors(options?: { onSuccess?: () => void }) {
	return useRefreshAction(refreshColors, options);
}
