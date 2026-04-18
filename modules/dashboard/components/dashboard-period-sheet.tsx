"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHandle,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { ComparisonModeSelector } from "./comparison-mode-selector";
import { PeriodSelector } from "./period-selector";
import {
	COMPARISON_MODE_SEARCH_PARAM,
	DEFAULT_COMPARISON_MODE,
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	getComparisonLabel,
	type ComparisonMode,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

interface DashboardPeriodSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const MOBILE_SNAP_POINTS: (number | string)[] = [0.5, 0.92];

/**
 * Bottom-sheet (mobile) / right-sheet (desktop) grouping the dashboard
 * period + comparison mode selectors. Both selectors push URL search params
 * on change, so no "Apply" button is needed — changes are committed immediately.
 *
 * Pattern inspired by `FilterSheetWrapper` but lighter (no form submission).
 */
export function DashboardPeriodSheet({ open, onOpenChange }: DashboardPeriodSheetProps) {
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const searchParams = useSearchParams();
	const period = (searchParams.get(PERIOD_SEARCH_PARAM) ?? DEFAULT_PERIOD) as DashboardPeriod;
	const comparisonMode = (searchParams.get(COMPARISON_MODE_SEARCH_PARAM) ??
		DEFAULT_COMPARISON_MODE) as ComparisonMode;

	// Focus restoration : snapshot the previously focused element before opening,
	// restore it after closing (pattern used across Synclune sheets).
	const previousFocusRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (open) {
			previousFocusRef.current = document.activeElement as HTMLElement | null;
			return;
		}
		const el = previousFocusRef.current;
		if (el && typeof el.focus === "function") {
			requestAnimationFrame(() => el.focus({ preventScroll: true }));
		}
		previousFocusRef.current = null;
	}, [open]);

	const handleOverlayClick = () => {
		haptic("selection");
	};

	const handleClose = () => {
		haptic("selection");
	};

	return (
		<Sheet
			direction={isMobile ? "bottom" : "right"}
			open={open}
			onOpenChange={onOpenChange}
			snapPoints={isMobile ? MOBILE_SNAP_POINTS : undefined}
		>
			<SheetContent
				className={cn(
					"flex w-full flex-col overflow-hidden p-0",
					!isMobile && "h-full sm:w-100",
					isMobile && "h-full rounded-t-2xl",
				)}
				title="Période"
				showCloseButton={false}
				onOverlayClick={handleOverlayClick}
				data-testid="dashboard-period-sheet"
			>
				{isMobile && <SheetHandle />}

				<SheetHeader className="border-primary/10 from-background via-primary/2 to-background relative shrink-0 border-b bg-linear-to-r px-6 py-5">
					<div className="flex items-center justify-between gap-4">
						<div className="space-y-0.5">
							<SheetTitle className="font-display text-lg font-normal tracking-tight">
								Période
							</SheetTitle>
							<SheetDescription className="text-muted-foreground text-sm">
								Choisissez la période d&apos;analyse et le mode de comparaison.
							</SheetDescription>
						</div>
						<SheetClose asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleClose}
								className="text-muted-foreground hover:text-foreground size-11 shrink-0"
								aria-label="Fermer"
							>
								<X className="size-4" />
							</Button>
						</SheetClose>
					</div>
				</SheetHeader>

				<div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
					<section className="space-y-3" aria-labelledby="period-section-period">
						<h3
							id="period-section-period"
							className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase"
						>
							Période d&apos;analyse
						</h3>
						<PeriodSelector variant="segmented" />
					</section>

					<section className="space-y-3" aria-labelledby="period-section-comparison">
						<h3
							id="period-section-comparison"
							className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase"
						>
							Comparaison
						</h3>
						<ComparisonModeSelector variant="segmented" />
						<p
							className="text-muted-foreground text-xs leading-tight"
							aria-live="polite"
							aria-atomic="true"
						>
							{getComparisonLabel(period, comparisonMode)}
						</p>
					</section>
				</div>

				<SheetFooter className="border-primary/10 bg-background shrink-0 border-t px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
					<SheetClose asChild>
						<Button
							type="button"
							variant="secondary"
							onClick={handleClose}
							className="h-11 w-full text-base"
						>
							Fermer
						</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
