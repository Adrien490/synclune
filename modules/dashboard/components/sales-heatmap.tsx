"use client";

import { useState } from "react";
import { Activity, X } from "lucide-react";
import ScrollFade from "@/shared/components/scroll-fade";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { formatEuro } from "@/shared/utils/format-euro";
import type { GetSalesHeatmapReturn } from "@/modules/dashboard/data/get-sales-heatmap";
import { computeCellOpacity } from "@/modules/dashboard/services/heatmap-builder.service";
import { CHART_STYLES } from "../constants/chart-styles";

interface SalesHeatmapProps {
	data: GetSalesHeatmapReturn;
}

interface SelectedCell {
	day: number;
	hour: number;
	count: number;
	revenue: number;
}

// French day labels for DOW: 0=Sunday → 6=Saturday
const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;
const DAY_LONG = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
const HOUR_TICKS = [0, 6, 12, 18];

/**
 * Sales heatmap (day-of-week × hour) — pure CSS grid, no chart lib
 * Each cell's opacity is proportional to that bucket's order count.
 * Mobile: flat section (no Card chrome). Desktop: full Card with shadow.
 */
export function SalesHeatmap({ data }: SalesHeatmapProps) {
	const { cells, maxCount, totalOrders, totalRevenue, periodLabel } = data;
	const isEmpty = totalOrders === 0;
	const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

	function selectCell(cell: SelectedCell) {
		triggerHaptic("selection");
		setSelectedCell((prev) =>
			prev && prev.day === cell.day && prev.hour === cell.hour ? null : cell,
		);
	}

	return (
		<section
			className={cn(
				"space-y-3",
				"md:border-primary/30 md:from-primary/5 md:can-hover:hover:shadow-lg md:rounded-xl md:border-l-4 md:bg-linear-to-br md:to-transparent md:p-6 md:shadow-md md:transition-all md:duration-300",
			)}
			aria-labelledby="sales-heatmap-title"
		>
			<header>
				<h3 id="sales-heatmap-title" className={cn(CHART_STYLES.title, "text-base md:text-xl")}>
					<span className="inline-flex items-center gap-2">
						<Activity className="h-4 w-4" aria-hidden="true" />
						Activité par jour & heure
					</span>
				</h3>
				<p className="text-muted-foreground text-xs md:text-sm">
					{isEmpty
						? `Aucune commande sur la période (${periodLabel.toLowerCase()})`
						: `${totalOrders} commande${totalOrders > 1 ? "s" : ""} · ${formatEuro(totalRevenue, { compact: true })} (${periodLabel.toLowerCase()})`}
				</p>
			</header>
			<div>
				{isEmpty ? (
					<div className="text-muted-foreground py-8 text-center text-sm">
						Pas assez de données pour afficher la heatmap
					</div>
				) : (
					<ScrollFade axis="horizontal">
						<div
							className="min-w-[640px] sm:min-w-[720px]"
							data-no-swipe-nav
							role="grid"
							aria-label={`Activité par jour et heure — ${periodLabel}`}
							aria-rowcount={7}
							aria-colcount={24}
						>
							{/* Hours axis */}
							<div
								className="text-muted-foreground mb-1 grid text-[10px]"
								style={{
									gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))",
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
											gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))",
										}}
										role="row"
										aria-rowindex={day + 1}
									>
										<div
											className="text-muted-foreground pr-1 text-right text-[11px] font-medium"
											role="rowheader"
										>
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
											const isSelected =
												selectedCell !== null &&
												selectedCell.day === day &&
												selectedCell.hour === hour;
											const interactive = count > 0;
											function handleClick() {
												if (!interactive) return;
												selectCell({ day, hour, count, revenue });
											}
											function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
												if (!interactive) return;
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													selectCell({ day, hour, count, revenue });
												}
											}
											return (
												<div
													key={hour}
													className={cn(
														"aspect-square rounded-sm",
														count === 0 ? "bg-muted/40" : "bg-primary",
														interactive &&
															"can-hover:hover:outline can-hover:hover:outline-1 can-hover:hover:outline-primary/80 cursor-pointer",
														interactive &&
															"focus-visible:outline-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
														isSelected && "outline-primary outline outline-2 outline-offset-1",
													)}
													style={count > 0 ? { opacity } : undefined}
													title={tooltip}
													aria-label={tooltip}
													aria-selected={interactive ? isSelected : undefined}
													role="gridcell"
													aria-colindex={hour + 1}
													tabIndex={interactive ? 0 : -1}
													onClick={handleClick}
													onKeyDown={handleKeyDown}
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
					</ScrollFade>
				)}

				{/* Selected cell info panel — aria-live so screen readers announce details on tap */}
				<div
					role="status"
					aria-live="polite"
					aria-atomic="true"
					data-testid="heatmap-selected-cell"
					className={cn(
						"border-border/60 bg-muted/30 mt-3 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-opacity duration-200",
						selectedCell ? "opacity-100" : "pointer-events-none opacity-0",
					)}
				>
					{selectedCell ? (
						<>
							<div className="min-w-0 flex-1">
								<span className="text-foreground font-medium capitalize">
									{DAY_LONG[selectedCell.day]} {selectedCell.hour}h
								</span>
								<span className="text-muted-foreground ml-2">
									{selectedCell.count} commande{selectedCell.count > 1 ? "s" : ""} ·{" "}
									{formatEuro(selectedCell.revenue, { compact: true })}
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									triggerHaptic("selection");
									setSelectedCell(null);
								}}
								className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
								aria-label="Fermer le détail"
							>
								<X className="h-4 w-4" aria-hidden="true" />
							</button>
						</>
					) : (
						<span className="text-muted-foreground text-xs">
							Touchez une cellule pour voir le détail
						</span>
					)}
				</div>
			</div>
		</section>
	);
}
