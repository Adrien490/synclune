"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { CHART_STYLES } from "@/modules/dashboard/constants/chart-styles";
import {
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	parsePeriod,
} from "@/modules/dashboard/constants/period.constants";
import { useExportDashboard } from "@/modules/dashboard/hooks/use-export-dashboard";
import type { ExportDashboardFormat } from "@/modules/dashboard/schemas/export-dashboard.schema";

interface ExportDashboardButtonProps {
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
	/** Render as a compact icon-only button (mobile header) */
	iconOnly?: boolean;
	/**
	 * Custom trigger element (e.g. a toolbar button in DashboardMobileActionBar).
	 * When provided, replaces the default `<Button>` trigger. The Drawer/Dropdown
	 * logic remains untouched — only the clickable surface changes.
	 */
	triggerSlot?: React.ReactNode;
}

/**
 * Export trigger for the dashboard report.
 *
 * - **Mobile** : Vaul bottom-sheet `Drawer` with two full-width format rows (CSV / JSON).
 *   Native iOS/Android feel, 56px tall touch targets, safe-area aware via Drawer primitive.
 * - **Desktop** : compact `DropdownMenu` anchored to the trigger.
 */
export function ExportDashboardButton({
	className,
	variant = "outline",
	iconOnly = false,
	triggerSlot,
}: ExportDashboardButtonProps) {
	const isMobile = useIsMobile();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const searchParams = useSearchParams();
	const period = parsePeriod(searchParams.get(PERIOD_SEARCH_PARAM) ?? DEFAULT_PERIOD);
	const { exportReport, isPending } = useExportDashboard({
		onSuccess: () => triggerHaptic("success"),
	});

	function handleExport(format: ExportDashboardFormat) {
		triggerHaptic("selection");
		setDrawerOpen(false);
		exportReport({ period, format });
	}

	const defaultTrigger = (
		<Button
			type="button"
			variant={variant}
			size={iconOnly ? "icon" : "default"}
			className={cn(
				iconOnly ? CHART_STYLES.touchTarget.iconButton : CHART_STYLES.touchTarget.button,
				className,
			)}
			disabled={isPending}
			onClick={() => triggerHaptic("medium")}
			aria-label="Exporter le rapport du tableau de bord"
		>
			{isPending ? (
				<Loader2 className="size-4 animate-spin" aria-hidden="true" />
			) : (
				<Download className="size-4" aria-hidden="true" />
			)}
			{!iconOnly && <span className="hidden md:inline">Exporter</span>}
			{iconOnly && <span className="sr-only">Exporter</span>}
		</Button>
	);

	const triggerButton = triggerSlot ?? defaultTrigger;

	if (isMobile) {
		return (
			<Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
				<DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
				<DrawerContent data-testid="export-dashboard-drawer">
					<DrawerHeader>
						<DrawerTitle>Exporter le tableau de bord</DrawerTitle>
						<DrawerDescription>
							Téléchargez un rapport pour la période sélectionnée.
						</DrawerDescription>
					</DrawerHeader>
					<DrawerBody className="pb-0">
						<div className="flex flex-col gap-2">
							<button
								type="button"
								onClick={() => handleExport("csv")}
								disabled={isPending}
								className="hover:bg-accent focus-visible:ring-ring flex min-h-14 items-center gap-3 rounded-lg border px-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
							>
								<FileSpreadsheet className="text-primary size-5 shrink-0" aria-hidden="true" />
								<div className="flex-1">
									<p className="text-sm font-medium">CSV (tableur)</p>
									<p className="text-muted-foreground text-xs">
										Ouvre dans Excel, Numbers ou Google Sheets
									</p>
								</div>
							</button>
							<button
								type="button"
								onClick={() => handleExport("json")}
								disabled={isPending}
								className="hover:bg-accent focus-visible:ring-ring flex min-h-14 items-center gap-3 rounded-lg border px-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
							>
								<FileJson className="text-primary size-5 shrink-0" aria-hidden="true" />
								<div className="flex-1">
									<p className="text-sm font-medium">JSON (brut)</p>
									<p className="text-muted-foreground text-xs">
										Données structurées pour traitement automatisé
									</p>
								</div>
							</button>
						</div>
					</DrawerBody>
					<DrawerFooter>
						<DrawerClose asChild>
							<Button variant="outline" className="min-h-11">
								Annuler
							</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Format du rapport</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => handleExport("csv")} disabled={isPending}>
					<FileSpreadsheet className="size-4" aria-hidden="true" />
					CSV (tableur)
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => handleExport("json")} disabled={isPending}>
					<FileJson className="size-4" aria-hidden="true" />
					JSON (brut)
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
