"use client";

import { Globe, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import type { CSSProperties } from "react";
import type { GetEuOssProgressReturn } from "@/modules/dashboard/data/get-eu-oss-progress";

interface EuOssProgressCardProps {
	data: GetEuOssProgressReturn;
}

/**
 * Carte de suivi du seuil unique UE des ventes à distance intra-communautaires
 * (10 000 €/an — dir. 2017/2455). Au-delà, TVA du pays de destination due via OSS.
 * Monitoring seul : aucune logique OSS n'est codée tant qu'on reste sous le seuil.
 * Devient `warning` à 80% et `critical` à 100%+.
 */
export function EuOssProgressCard({ data }: EuOssProgressCardProps) {
	const { ytdEuSales, threshold, progress, year } = data;
	const status: "default" | "warning" | "critical" =
		progress >= 100 ? "critical" : progress >= 80 ? "warning" : "default";

	const remaining = Math.max(threshold - ytdEuSales, 0);
	const cappedProgress = Math.min(progress, 100);

	const subtitle =
		status === "critical"
			? "Seuil dépassé — inscription OSS + TVA du pays de destination (voir comptable)"
			: status === "warning"
				? `Plus que ${formatEuro(remaining, { compact: true })} avant le guichet OSS`
				: `${formatEuro(remaining, { compact: true })} restants avant le seuil OSS`;

	return (
		<Card
			className={cn(
				"via-background relative overflow-hidden border-l-4 bg-linear-to-br to-transparent transition-[transform,box-shadow] duration-300",
				status === "critical" && "border-destructive/60 from-destructive/10 shadow-md",
				status === "warning" && "border-warning/60 from-warning/10 shadow-md",
				status === "default" && "border-info/40 from-info/5",
			)}
			role="region"
			aria-labelledby="eu-oss-progress-card-title"
			style={{ viewTransitionName: "eu-oss-progress-card" } as CSSProperties}
		>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div className="flex items-center gap-1.5">
					<CardTitle
						id="eu-oss-progress-card-title"
						className="text-muted-foreground text-sm font-medium"
					>
						Seuil OSS UE {year}
					</CardTitle>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={() => triggerHaptic("selection")}
								className="text-muted-foreground/60 hover:text-muted-foreground focus-visible:ring-ring -m-3 inline-flex size-11 cursor-help touch-manipulation items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
								aria-label="Info: Seuil OSS ventes à distance intra-UE"
							>
								<Info className="size-3.5" aria-hidden="true" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="top" className="max-w-xs">
							<p className="text-sm">
								Ventes vers les autres pays de l'UE (hors France). Au-delà de 10 000 €/an cumulés,
								la TVA du pays de destination s'applique via le guichet unique OSS.
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
					<Globe className="size-4" aria-hidden="true" />
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				<div className="flex items-baseline justify-between gap-2">
					<span className="text-2xl font-semibold tracking-tight tabular-nums">
						{formatEuro(ytdEuSales, { compact: true })}
					</span>
					<span className="text-muted-foreground text-sm tabular-nums">
						/ {formatEuro(threshold, { compact: true })}
					</span>
				</div>

				<Progress
					value={cappedProgress}
					aria-label={`Ventes à distance intra-UE : ${progress.toFixed(0)} % du seuil OSS`}
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
