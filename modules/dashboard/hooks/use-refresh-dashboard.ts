"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshDashboard } from "@/modules/dashboard/actions/refresh-dashboard";

interface UseRefreshDashboardOptions {
	onSuccess?: () => void;
}

export function useRefreshDashboard(options?: UseRefreshDashboardOptions) {
	return useRefreshAction(refreshDashboard, {
		onSuccess: options?.onSuccess,
	});
}
