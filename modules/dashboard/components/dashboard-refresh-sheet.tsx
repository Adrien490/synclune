"use client";

import { useEffect, useRef } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
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
import { useRefreshDashboard } from "@/modules/dashboard/hooks/use-refresh-dashboard";
import { RelativeClock } from "@/modules/dashboard/components/relative-clock";

interface DashboardRefreshSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const MOBILE_SNAP_POINTS: (number | string)[] = [0.5];

/**
 * Bottom-sheet (mobile) / right-sheet (desktop) to trigger a manual dashboard
 * data sync. Shows when data was last refreshed, with a primary "Refresh now"
 * button and a secondary "Cancel". The sheet auto-closes on success.
 *
 * Tick interval : 1s while open, stops when closed (no background polling).
 */
export function DashboardRefreshSheet({ open, onOpenChange }: DashboardRefreshSheetProps) {
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { refresh, isPending, lastRefreshedAt } = useRefreshDashboard({
		onSuccess: () => {
			haptic("success");
			onOpenChange(false);
		},
	});

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

	const handleRefresh = () => {
		haptic("medium");
		refresh();
	};

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
				title="Synchroniser les données"
				showCloseButton={false}
				onOverlayClick={handleOverlayClick}
				data-pending={isPending ? "" : undefined}
				aria-busy={isPending}
				data-testid="dashboard-refresh-sheet"
			>
				{isMobile && <SheetHandle />}

				<SheetHeader className="border-primary/10 from-background via-primary/2 to-background relative shrink-0 border-b bg-linear-to-r px-6 py-5">
					<div className="flex items-center justify-between gap-4">
						<div className="space-y-0.5">
							<SheetTitle className="font-display text-lg font-normal tracking-tight">
								Synchroniser les données
							</SheetTitle>
							<SheetDescription className="text-muted-foreground text-sm">
								Met à jour les KPIs, graphiques et listes affichés.
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

				<div className="flex-1 gap-y-4 p-6">
					<div className="bg-muted/40 rounded-lg border px-4 py-3">
						<p className="text-muted-foreground text-xs tracking-wide uppercase">
							Dernière mise à jour
						</p>
						<p
							className="text-foreground mt-1 text-sm font-medium"
							aria-live="polite"
							aria-atomic="true"
							data-testid="dashboard-refresh-last-sync"
						>
							<RelativeClock from={lastRefreshedAt} paused={!open} />
						</p>
					</div>

					<p className="text-muted-foreground text-xs leading-relaxed">
						Les données peuvent être mises en cache jusqu&apos;à quelques minutes selon les widgets.
						Déclenchez une synchronisation pour forcer un rafraîchissement immédiat.
					</p>
				</div>

				<SheetFooter className="border-primary/10 bg-background shrink-0 gap-2 border-t px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
					<Button
						type="button"
						onClick={handleRefresh}
						disabled={isPending}
						className="h-14 w-full text-base"
					>
						{isPending ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<RefreshCw className="size-4" aria-hidden="true" />
						)}
						{isPending ? "Synchronisation…" : "Rafraîchir maintenant"}
					</Button>
					<SheetClose asChild>
						<Button
							type="button"
							variant="secondary"
							onClick={handleClose}
							disabled={isPending}
							className="h-11 w-full text-base"
						>
							Annuler
						</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
