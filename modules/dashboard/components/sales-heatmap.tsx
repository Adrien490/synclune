import { Activity } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import type { GetSalesHeatmapReturn } from "@/modules/dashboard/data/get-sales-heatmap";
import { computeCellOpacity } from "@/modules/dashboard/services/heatmap-builder.service";
import { CHART_STYLES } from "../constants/chart-styles";

interface SalesHeatmapProps {
	data: GetSalesHeatmapReturn;
}

// French day labels for DOW: 0=Sunday → 6=Saturday
const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;
const DAY_LONG = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
const HOUR_TICKS = [0, 6, 12, 18];

/**
 * Sales heatmap (day-of-week × hour) — pure CSS grid, no chart lib
 * Each cell's opacity is proportional to that bucket's order count.
 */
export function SalesHeatmap({ data }: SalesHeatmapProps) {
	const { cells, maxCount, totalOrders, totalRevenue, periodLabel } = data;
	const isEmpty = totalOrders === 0;

	return (
		<Card
			className={cn(CHART_STYLES.card, "can-hover:hover:shadow-lg transition-all duration-300")}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between gap-2">
					<div>
						<CardTitle className={CHART_STYLES.title}>
							<span className="inline-flex items-center gap-2">
								<Activity className="h-4 w-4" aria-hidden="true" />
								Activité par jour & heure
							</span>
						</CardTitle>
						<CardDescription className="text-sm">
							{isEmpty
								? `Aucune commande sur la période (${periodLabel.toLowerCase()})`
								: `${totalOrders} commande${totalOrders > 1 ? "s" : ""} · ${formatEuro(totalRevenue, { compact: true })} (${periodLabel.toLowerCase()})`}
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{isEmpty ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						Pas assez de données pour afficher la heatmap
					</div>
				) : (
					<div className="overflow-x-auto">
						<div className="min-w-[600px]">
							{/* Hours axis */}
							<div
								className="text-muted-foreground mb-1 grid text-[10px]"
								style={{
									gridTemplateColumns: "32px repeat(24, minmax(0, 1fr))",
								}}
								aria-hidden="true"
							>
								<div />
								{Array.from({ length: 24 }).map((_, h) => (
									<div key={h} className="text-center">
										{HOUR_TICKS.includes(h) ? `${h}h` : ""}
									</div>
								))}
							</div>

							{/* Day rows */}
							<div className="space-y-0.5">
								{DAY_LABELS.map((label, day) => (
									<div
										key={day}
										className="grid items-center gap-0.5"
										style={{
											gridTemplateColumns: "32px repeat(24, minmax(0, 1fr))",
										}}
									>
										<div className="text-muted-foreground pr-1 text-right text-[11px] font-medium">
											{label}
										</div>
										{Array.from({ length: 24 }).map((_, hour) => {
											const cell = cells[day * 24 + hour];
											const opacity = cell ? computeCellOpacity(cell.count, maxCount) : 0;
											const count = cell?.count ?? 0;
											const revenue = cell?.revenue ?? 0;
											const tooltip =
												count === 0
													? `${DAY_LONG[day]} ${hour}h — aucune commande`
													: `${DAY_LONG[day]} ${hour}h — ${count} commande${count > 1 ? "s" : ""} · ${formatEuro(revenue, { compact: true })}`;
											return (
												<div
													key={hour}
													className={cn(
														"aspect-square rounded-sm",
														count === 0 ? "bg-muted/40" : "bg-primary",
													)}
													style={count > 0 ? { opacity } : undefined}
													title={tooltip}
													aria-label={tooltip}
													role="img"
												/>
											);
										})}
									</div>
								))}
							</div>

							{/* Legend */}
							<div className="text-muted-foreground mt-3 flex items-center gap-2 text-[11px]">
								<span>Moins</span>
								<div className="flex items-center gap-0.5">
									{[0.15, 0.35, 0.6, 0.8, 1].map((o) => (
										<div
											key={o}
											className="bg-primary h-3 w-3 rounded-sm"
											style={{ opacity: o }}
											aria-hidden="true"
										/>
									))}
								</div>
								<span>Plus</span>
								<span className="ml-auto">
									Pic : {maxCount} commande{maxCount > 1 ? "s" : ""}/h
								</span>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
