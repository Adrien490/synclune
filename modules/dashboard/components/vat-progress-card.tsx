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
 * Affiche le cumul YTD, le seuil de base applicable et une barre de progression.
 *
 * ⚠️ Quatre paliers, parce que les deux seuils n'ont PAS la même conséquence :
 * franchir le seuil de BASE (85 000 €) en cours d'année laisse la franchise
 * intacte jusqu'au 31 décembre, alors que franchir le seuil MAJORÉ (93 500 €)
 * rend la TVA due dès le 1er du mois de dépassement. La carte annonçait
 * l'échéance du majoré dès le franchissement du base — fausse consigne, et rien
 * ne signalait le majoré, où elle devient vraie (audit franchise TVA 2026-07-27).
 */
export function VatProgressCard({ data }: VatProgressCardProps) {
	const { ytdRevenue, threshold, majoredThreshold, progress, year } = data;
	const status: "default" | "warning" | "exceeded" | "critical" =
		ytdRevenue >= majoredThreshold
			? "critical"
			: ytdRevenue >= threshold
				? "exceeded"
				: progress >= 80
					? "warning"
					: "default";

	const remaining = Math.max(threshold - ytdRevenue, 0);
	const cappedProgress = Math.min(progress, 100);
	// `warning` et `exceeded` partagent la teinte ambre : ni l'un ni l'autre n'exige
	// une action ce mois-ci. Le rouge reste réservé au majoré.
	const isAmber = status === "warning" || status === "exceeded";

	const subtitle =
		status === "critical"
			? "Seuil majoré dépassé — TVA due depuis le 1er du mois en cours"
			: status === "exceeded"
				? "Seuil de base dépassé — franchise maintenue cette année, préviens ton comptable"
				: status === "warning"
					? `Plus que ${formatEuro(remaining, { compact: true })} avant le seuil de base`
					: `${formatEuro(remaining, { compact: true })} restants avant le seuil`;

	return (
		<Card
			className={cn(
				"via-background relative overflow-hidden border-l-4 bg-linear-to-br to-transparent transition-[transform,box-shadow] duration-300",
				status === "critical" && "border-destructive/60 from-destructive/10 shadow-md",
				isAmber && "border-warning/60 from-warning/10 shadow-md",
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
						<TooltipTrigger
							render={
								<button
									type="button"
									className="text-muted-foreground/60 hover:text-muted-foreground focus-visible:ring-ring -m-3 inline-flex size-11 cursor-help touch-manipulation items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
									aria-label="Info: Seuil TVA franchise"
								/>
							}
						>
							<Info className="size-3.5" aria-hidden="true" />
						</TooltipTrigger>
						<TooltipContent side="top" className="max-w-xs">
							<p className="text-sm">
								Franchise en base art. 293 B CGI. Au-delà du seuil de base, la franchise reste
								acquise jusqu&apos;au 31 décembre. Au-delà du seuil majoré (
								{formatEuro(majoredThreshold, { compact: true })}), la TVA devient due dès le 1er du
								mois de dépassement.
							</p>
						</TooltipContent>
					</Tooltip>
				</div>
				<div
					className={cn(
						"inline-flex size-8 items-center justify-center rounded-full border transition-colors",
						status === "critical" && "border-destructive/30 bg-destructive/15 text-destructive",
						isAmber && "border-warning/30 bg-warning/15 text-warning",
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
						isAmber && "[&>[data-slot=progress-indicator]]:bg-warning",
					)}
				/>

				<p
					className={cn(
						"text-xs font-medium",
						status === "critical" && "text-destructive",
						isAmber && "text-warning",
						status === "default" && "text-muted-foreground",
					)}
				>
					{progress.toFixed(0)} % du seuil · {subtitle}
				</p>
			</CardContent>
		</Card>
	);
}
