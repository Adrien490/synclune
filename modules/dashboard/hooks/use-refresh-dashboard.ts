"use client";

import { useState } from "react";
import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshDashboard } from "@/modules/dashboard/actions/refresh-dashboard";

interface UseRefreshDashboardOptions {
	onSuccess?: () => void;
}

export const DASHBOARD_REFRESHED_EVENT = "dashboard:refreshed" as const;

export function useRefreshDashboard(options?: UseRefreshDashboardOptions) {
	const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

	const result = useRefreshAction(refreshDashboard, {
		onSuccess: () => {
			setLastRefreshedAt(new Date());
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESHED_EVENT));
			}
			options?.onSuccess?.();
		},
	});

	return { ...result, lastRefreshedAt };
}
