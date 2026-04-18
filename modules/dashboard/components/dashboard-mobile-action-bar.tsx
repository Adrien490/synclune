"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarRange, Download, RefreshCw } from "lucide-react";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { DashboardPeriodSheet } from "./dashboard-period-sheet";
import { DashboardRefreshSheet } from "./dashboard-refresh-sheet";
import { ExportDashboardButton } from "./export-dashboard-button";
import {
	COMPARISON_MODE_SEARCH_PARAM,
	DASHBOARD_PERIODS_SHORT,
	DEFAULT_COMPARISON_MODE,
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	type ComparisonMode,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

interface DashboardMobileActionBarProps {
	className?: string;
}

/**
 * Mobile sub-header for the admin dashboard.
 *
 * Pattern inspired by `ProductSortBar` (storefront) — 3 compact toolbar buttons
 * (Période / Rafraîchir / Télécharger), each opening its own bottom-sheet.
 * Sticky directly below the `AdminMobileHeader` (which owns the h1 title), so
 * no heading is rendered here (avoids duplicate "Tableau de bord" h1s).
 *
 * Accessibility :
 * - `role="toolbar"` + `aria-orientation="horizontal"` + arrow-key navigation
 * - Live region announces active period / comparison changes
 * - 44px touch targets (WCAG 2.5.5)
 * - Haptic `selection` on tap
 */
export function DashboardMobileActionBar({ className }: DashboardMobileActionBarProps) {
	const searchParams = useSearchParams();
	const period = (searchParams.get(PERIOD_SEARCH_PARAM) ?? DEFAULT_PERIOD) as DashboardPeriod;
	const comparisonMode = (searchParams.get(COMPARISON_MODE_SEARCH_PARAM) ??
		DEFAULT_COMPARISON_MODE) as ComparisonMode;

	const hasCustomPeriod = period !== DEFAULT_PERIOD || comparisonMode !== DEFAULT_COMPARISON_MODE;

	const [periodOpen, setPeriodOpen] = useState(false);
	const [refreshOpen, setRefreshOpen] = useState(false);

	const [focusedIndex, setFocusedIndex] = useState(0);
	const periodButtonRef = useRef<HTMLButtonElement>(null);
	const refreshButtonRef = useRef<HTMLButtonElement>(null);
	const exportButtonRef = useRef<HTMLButtonElement>(null);
	const buttonRefs = [periodButtonRef, refreshButtonRef, exportButtonRef];

	const announcementRef = useRef<HTMLSpanElement>(null);
	const prevStateRef = useRef({ period, comparisonMode });

	useEffect(() => {
		const prev = prevStateRef.current;
		if (prev.period === period && prev.comparisonMode === comparisonMode) return;
		prevStateRef.current = { period, comparisonMode };

		const parts = [
			period !== DEFAULT_PERIOD && `Période : ${DASHBOARD_PERIODS_SHORT[period]}`,
			comparisonMode !== DEFAULT_COMPARISON_MODE && "Comparaison : année N-1",
		]
			.filter(Boolean)
			.join(". ");

		if (announcementRef.current) announcementRef.current.textContent = parts;

		const timer = window.setTimeout(() => {
			if (announcementRef.current) announcementRef.current.textContent = "";
		}, 3000);
		return () => window.clearTimeout(timer);
	}, [period, comparisonMode]);

	const handleToolbarKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
		const buttonCount = 3;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				nextIndex = (currentIndex + 1) % buttonCount;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				nextIndex = (currentIndex - 1 + buttonCount) % buttonCount;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = buttonCount - 1;
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndex(nextIndex);
			buttonRefs[nextIndex]?.current?.focus();
		}
	};

	const buttonBase = cn(
		"flex flex-1 items-center justify-center gap-1.5 h-11 min-w-0 px-2",
		"text-xs font-medium text-muted-foreground",
		"hover:text-foreground",
		"active:bg-primary/5 active:scale-[0.98]",
		"motion-safe:transition-[color,background-color,transform] motion-safe:duration-150",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
	);
	const buttonActive = "text-foreground";

	const openPeriod = () => {
		triggerHaptic("selection");
		setRefreshOpen(false);
		setPeriodOpen(true);
	};

	const openRefresh = () => {
		triggerHaptic("selection");
		setPeriodOpen(false);
		setRefreshOpen(true);
	};

	return (
		<>
			<nav
				aria-label="Actions du tableau de bord"
				className={cn(
					"md:hidden",
					"sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30",
					"bg-background/80 backdrop-blur-md",
					"border-border/50 border-b",
					"mx-[calc(var(--admin-main-x,1.5rem)*-1)]",
					className,
				)}
			>
				<div
					role="toolbar"
					aria-orientation="horizontal"
					aria-label="Actions du tableau de bord"
					className="divide-border/30 flex items-stretch divide-x"
				>
					{/* Période */}
					<button
						ref={periodButtonRef}
						type="button"
						onClick={openPeriod}
						onKeyDown={(e) => handleToolbarKeyDown(e, 0)}
						onFocus={() => setFocusedIndex(0)}
						tabIndex={focusedIndex === 0 ? 0 : -1}
						className={cn(buttonBase, hasCustomPeriod && buttonActive)}
						aria-label={
							hasCustomPeriod
								? `Période active : ${DASHBOARD_PERIODS_SHORT[period]}. Modifier la période`
								: "Ouvrir le sélecteur de période"
						}
						aria-haspopup="dialog"
						aria-expanded={periodOpen}
					>
						<CalendarRange className="size-4" aria-hidden="true" />
						<span className="truncate">Période</span>
						{hasCustomPeriod && (
							<span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden="true" />
						)}
					</button>

					{/* Rafraîchir */}
					<button
						ref={refreshButtonRef}
						type="button"
						onClick={openRefresh}
						onKeyDown={(e) => handleToolbarKeyDown(e, 1)}
						onFocus={() => setFocusedIndex(1)}
						tabIndex={focusedIndex === 1 ? 0 : -1}
						className={buttonBase}
						aria-label="Ouvrir la synchronisation des données"
						aria-haspopup="dialog"
						aria-expanded={refreshOpen}
					>
						<RefreshCw className="size-4" aria-hidden="true" />
						<span className="truncate">Rafraîchir</span>
					</button>

					{/* Télécharger — réutilise ExportDashboardButton (Drawer mobile / Dropdown desktop)
					    via la prop triggerSlot pour matcher le style toolbar. */}
					<ExportDashboardButton
						triggerSlot={
							<button
								ref={exportButtonRef}
								type="button"
								onKeyDown={(e) => handleToolbarKeyDown(e, 2)}
								onFocus={() => setFocusedIndex(2)}
								onClick={() => triggerHaptic("selection")}
								tabIndex={focusedIndex === 2 ? 0 : -1}
								className={buttonBase}
								aria-label="Exporter le rapport du tableau de bord"
								aria-haspopup="dialog"
							>
								<Download className="size-4" aria-hidden="true" />
								<span className="truncate">Télécharger</span>
							</button>
						}
					/>
				</div>

				<span
					ref={announcementRef}
					role="status"
					aria-live="polite"
					aria-atomic="true"
					className="sr-only"
				/>
			</nav>

			<DashboardPeriodSheet open={periodOpen} onOpenChange={setPeriodOpen} />
			<DashboardRefreshSheet open={refreshOpen} onOpenChange={setRefreshOpen} />
		</>
	);
}
