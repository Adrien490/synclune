"use client";

import { useEffect, useState } from "react";

import { cn } from "@/shared/utils/cn";

import { DASHBOARD_REFRESHED_EVENT } from "@/modules/dashboard/hooks/use-refresh-dashboard";

import { RelativeClock } from "./relative-clock";

const ADMIN_PULL_TO_REFRESH_EVENT = "admin:pull-to-refresh" as const;

interface DashboardFreshnessProps {
	className?: string;
}

/**
 * "Affiché il y a X" indicator. The timestamp reflects the client mount
 * (or the latest refresh event), NOT the server cache regeneration — hence
 * "Affiché à" rather than "Mis à jour", which would be misleading given the
 * 60s `user` cache profile.
 *
 * Resets when `useRefreshDashboard` succeeds (RefreshSheet button) or when
 * the shared `PullToRefresh` gesture fires — both dispatch window events
 * this component subscribes to.
 */
export function DashboardFreshness({ className }: DashboardFreshnessProps) {
	const [mountedAt, setMountedAt] = useState<Date>(() => new Date());

	useEffect(() => {
		const handler = () => setMountedAt(new Date());
		window.addEventListener(DASHBOARD_REFRESHED_EVENT, handler);
		window.addEventListener(ADMIN_PULL_TO_REFRESH_EVENT, handler);
		return () => {
			window.removeEventListener(DASHBOARD_REFRESHED_EVENT, handler);
			window.removeEventListener(ADMIN_PULL_TO_REFRESH_EVENT, handler);
		};
	}, []);

	return (
		<p className={cn("text-muted-foreground flex items-center gap-1.5 text-xs", className)}>
			<span
				className="bg-success/60 size-1.5 shrink-0 rounded-full motion-safe:animate-pulse"
				aria-hidden="true"
			/>
			<span>
				Affiché <RelativeClock from={mountedAt} paused={false} />
			</span>
		</p>
	);
}
