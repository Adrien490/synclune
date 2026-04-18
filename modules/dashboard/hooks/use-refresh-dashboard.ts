"use client";

import { useState } from "react";
import { useRefreshAction } from "@/shared/hooks/use-action-with-toast";
import { refreshDashboard } from "@/modules/dashboard/actions/refresh-dashboard";

interface UseRefreshDashboardOptions {
	onSuccess?: () => void;
}

export function useRefreshDashboard(options?: UseRefreshDashboardOptions) {
	const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

	const result = useRefreshAction(refreshDashboard, {
		onSuccess: () => {
			setLastRefreshedAt(new Date());
			options?.onSuccess?.();
		},
	});

	return { ...result, lastRefreshedAt };
}
