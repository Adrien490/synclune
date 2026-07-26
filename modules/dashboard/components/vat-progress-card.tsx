"use client";

import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import type { CSSProperties } from "react";
import type { GetVatProgressReturn } from "@/modules/dashboard/data/get-vat-progress";

interface VatProgressCardProps {
	data: GetVatProgressReturn;
}

/**
 * Carte de suivi du seuil de franchise en base TVA (article 293 B CGI).
 * Affiche le cumul YTD, le seuil applicable et une barre de progression.
 * Devient `warning` à 80% et `critical` (destructive) à 100%+.
 */
export function VatProgressCard({ data }: VatProgressCardProps) {
	const { ytdRevenue, threshold, progress, year } = data;
	const status: "default" | "warning" | "critical" =
		progress >= 100 ? "critical" : progress >= 80 ? "warning" : "default";

	const remaining = Math.max(threshold - ytdRevenue, 0);
	const cappedProgress = Math.min(progress, 100);

	const subtitle =
		status === "critical"
			? "Seuil dépassé — bascule TVA applicable au 1er du mois en cours"
			: status === "warning"
				? `Plus que ${formatEuro(remaining, { compact: true })} avant la bascule TVA`
				: `${formatEuro(remaining, { compact: true })} restants avant le seuil`;

	return (
		<Card
			className={cn(
				"via-background relative overflow-hidden border-l-4 bg-linear-to-br to-transparent transition-[transform,box-shadow] duration-300",
				status === "critical" && "border-destructive/60 from-destructive/10 shadow-md",
				status === "warning" && "border-warning/60 from-warning/10 shadow-md",
				status === "default" && "border-info/40 from-info/5",
			)}
			role="region"
			aria-labelledby="vat-progress-card-title"
			style={{ viewTransitionName: "vat-progress-card" } as CSSProperties}
		>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div className="flex items-center gap-1.5">
					<CardTitle
						id="vat-progress-card-title"
						className="text-muted-foreground text-sm font-medium"
					>
						Seuil TVA {year}
					</CardTitle>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								className="text-muted-foreground/60 hover:text-muted-foreground focus-visible:ring-ring -m-3 inline-flex size-11 cursor-help touch-manipulation items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
								aria-label="Info: Seuil TVA franchise"
							>
								<Info className="size-3.5" aria-hidden="true" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="top" className="max-w-xs">
							<p className="text-sm">
								Franchise en base art. 293 B CGI. Au-delà du seuil, TVA applicable rétroactivement
								au 1er du mois en cours.
							</p>
						</TooltipContent>
					</Tooltip>
				</div>
				<div
					className={cn(
						"inline-flex size-8 items-center justify-center rounded-full border transition-colors",
						status === "critical" && "border-destructive/30 bg-destructive/15 text-destructive",
						status === "warning" && "border-warning/30 bg-warning/15 text-warning",
						status === "default" && "border-info/30 bg-info/15 text-info",
					)}
				>
					<Receipt className="size-4" aria-hidden="true" />
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				<div className="flex items-baseline justify-between gap-2">
					<span className="text-2xl font-semibold tracking-tight tabular-nums">
						{formatEuro(ytdRevenue, { compact: true })}
					</span>
					<span className="text-muted-foreground text-sm tabular-nums">
						/ {formatEuro(threshold, { compact: true })}
					</span>
				</div>

				<Progress
					value={cappedProgress}
					aria-label={`Cumul du chiffre d'affaires : ${progress.toFixed(0)} % du seuil`}
					className={cn(
						status === "critical" && "[&>[data-slot=progress-indicator]]:bg-destructive",
						status === "warning" && "[&>[data-slot=progress-indicator]]:bg-warning",
					)}
				/>

				<p
					className={cn(
						"text-xs font-medium",
						status === "critical" && "text-destructive",
						status === "warning" && "text-warning",
						status === "default" && "text-muted-foreground",
					)}
				>
					{progress.toFixed(0)} % du seuil · {subtitle}
				</p>
			</CardContent>
		</Card>
	);
}
