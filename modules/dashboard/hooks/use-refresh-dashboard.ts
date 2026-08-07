"use client";

import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshDashboard } from "@/modules/dashboard/actions/refresh-dashboard";

interface UseRefreshDashboardOptions {
	onSuccess?: () => void;
}

const DASHBOARD_REFRESHED_EVENT = "dashboard:refreshed" as const;

export function useRefreshDashboard(options?: UseRefreshDashboardOptions) {
	return useRefreshAction(refreshDashboard, {
		onSuccess: () => {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESHED_EVENT));
			}
			options?.onSuccess?.();
		},
	});
}
