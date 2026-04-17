"use client";

import { useEffect } from "react";
import {
	PULL_TO_REFRESH_EVENT,
	type PullToRefreshEventDetail,
} from "@/shared/components/pull-to-refresh";
import { refreshDashboard } from "@/modules/dashboard/actions/refresh-dashboard";

/**
 * Subscribes the dashboard page to the global PullToRefresh gesture.
 *
 * When the user pulls to refresh from the top of `/admin`, the PTR component
 * dispatches `admin:pull-to-refresh` before calling `router.refresh()`. This
 * bridge registers a handler that invokes the `refreshDashboard` server action
 * (which calls `updateTag(DASHBOARD_CACHE_TAGS)`) and hands the resulting
 * promise back via `detail.waitFor`, so the PTR awaits cache invalidation
 * before re-rendering the RSC tree.
 *
 * Client-only, mount once at the dashboard page root.
 */
export function DashboardPullToRefreshBridge() {
	useEffect(() => {
		function handler(event: Event) {
			const detail = (event as CustomEvent<PullToRefreshEventDetail | undefined>).detail;
			const waitFor = detail?.waitFor;
			if (typeof waitFor !== "function") return;
			const formData = new FormData();
			const task = refreshDashboard(undefined, formData)
				.then(() => undefined)
				.catch(() => undefined);
			waitFor(task);
		}
		window.addEventListener(PULL_TO_REFRESH_EVENT, handler);
		return () => window.removeEventListener(PULL_TO_REFRESH_EVENT, handler);
	}, []);

	return null;
}
