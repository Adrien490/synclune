"use client";

import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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
}

export function ExportDashboardButton({
	className,
	variant = "outline",
}: ExportDashboardButtonProps) {
	const searchParams = useSearchParams();
	const period = parsePeriod(searchParams.get(PERIOD_SEARCH_PARAM) ?? DEFAULT_PERIOD);
	const { exportReport, isPending } = useExportDashboard();

	function handleExport(format: ExportDashboardFormat) {
		exportReport({ period, format });
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant={variant}
					className={className}
					disabled={isPending}
					aria-label="Exporter le rapport du tableau de bord"
				>
					{isPending ? (
						<Loader2 className="size-4 animate-spin" aria-hidden="true" />
					) : (
						<Download className="size-4" aria-hidden="true" />
					)}
					<span className="hidden md:inline">Exporter</span>
				</Button>
			</DropdownMenuTrigger>
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
