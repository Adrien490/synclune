"use client";

import { CalendarRange, ChevronDown, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

import {
	DASHBOARD_PERIODS,
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

import { DashboardPeriodSheet } from "./dashboard-period-sheet";
import { DashboardRefreshSheet } from "./dashboard-refresh-sheet";

interface DashboardMobileActionsProps {
	className?: string;
}

/**
 * Mobile-only action bar for the dashboard PageHeader.
 * Renders 3 trigger buttons (44px WCAG) that open:
 * - Period sheet (Vaul bottom, snap [0.5, 0.92])
 * - Refresh sheet (Vaul bottom, snap [0.5], includes RelativeClock freshness)
 *
 * Wired in app/admin/(dashboard)/page.tsx — desktop keeps the inline 3-button row.
 */
export function DashboardMobileActions({ className }: DashboardMobileActionsProps) {
	return (
		<Suspense fallback={<DashboardMobileActionsFallback className={className} />}>
			<DashboardMobileActionsInner className={className} />
		</Suspense>
	);
}

function DashboardMobileActionsInner({ className }: DashboardMobileActionsProps) {
	const [periodOpen, setPeriodOpen] = useState(false);
	const [refreshOpen, setRefreshOpen] = useState(false);
	const searchParams = useSearchParams();
	const currentPeriod = (searchParams.get(PERIOD_SEARCH_PARAM) ??
		DEFAULT_PERIOD) as DashboardPeriod;
	const periodLabel = DASHBOARD_PERIODS[currentPeriod].label;

	function handleOpenPeriod() {
		triggerHaptic("selection");
		setPeriodOpen(true);
	}

	function handleOpenRefresh() {
		triggerHaptic("light");
		setRefreshOpen(true);
	}

	return (
		<>
			<div
				className={cn("flex w-full items-center gap-2", className)}
				role="group"
				aria-label="Actions du tableau de bord"
			>
				<Button
					type="button"
					variant="outline"
					onClick={handleOpenPeriod}
					aria-haspopup="dialog"
					aria-expanded={periodOpen}
					aria-label={`Période : ${periodLabel}. Ouvrir le sélecteur de période.`}
					className="h-11 flex-1 touch-manipulation justify-between gap-2 px-3 active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150"
				>
					<span className="flex min-w-0 items-center gap-2">
						<CalendarRange className="size-4 shrink-0 opacity-70" aria-hidden="true" />
						<span className="truncate text-sm font-medium">{periodLabel}</span>
					</span>
					<ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
				</Button>

				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={handleOpenRefresh}
					aria-haspopup="dialog"
					aria-expanded={refreshOpen}
					aria-label="Synchroniser les données"
					className="size-11 shrink-0 touch-manipulation active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150"
				>
					<RefreshCw className="size-4" aria-hidden="true" />
				</Button>
			</div>

			<DashboardPeriodSheet open={periodOpen} onOpenChange={setPeriodOpen} />
			<DashboardRefreshSheet open={refreshOpen} onOpenChange={setRefreshOpen} />
		</>
	);
}

function DashboardMobileActionsFallback({ className }: DashboardMobileActionsProps) {
	return (
		<div className={cn("flex w-full items-center gap-2", className)} aria-hidden="true">
			<div className="bg-muted/40 h-11 flex-1 animate-pulse rounded-md" />
			<div className="bg-muted/40 size-11 animate-pulse rounded-md" />
		</div>
	);
}
