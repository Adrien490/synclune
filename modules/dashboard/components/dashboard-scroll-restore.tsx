"use client";

import { useDashboardScrollRestore } from "@/modules/dashboard/hooks/use-dashboard-scroll-restore";

/**
 * Client-only mount point that activates the dashboard scroll-restoration hook.
 * Rendered once at the top of `/admin` so the scrollY position survives
 * back-navigation from drill-down pages (orders, products, etc.).
 */
export function DashboardScrollRestore() {
	useDashboardScrollRestore();
	return null;
}
