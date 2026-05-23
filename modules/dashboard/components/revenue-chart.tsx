"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "./chart";
import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import type { GetRevenueChartReturn } from "@/modules/dashboard/data/get-revenue-chart";

import { cn } from "@/shared/utils/cn";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartEmpty } from "./chart-empty";
import { ChartScrollContainer } from "./chart-scroll-container";
import { CHART_STYLES } from "../constants/chart-styles";
import {
	CHART_MODE_SEARCH_PARAM,
	DEFAULT_CHART_MODE,
	type ChartMode,
} from "../constants/period.constants";

interface RevenueChartProps {
	chartData: GetRevenueChartReturn;
	periodLabel?: string;
	chartMode?: ChartMode;
}

const simpleChartConfig = {
	revenue: {
		label: "Chiffre d'affaires",
		color: "var(--chart-1)",
	},
	orders: {
		label: "Commandes",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

const detailedChartConfig = {
	subtotal: {
		label: "Produits",
		color: "var(--chart-1)",
	},
	shipping: {
		label: "Livraison",
		color: "var(--chart-3)",
	},
	discounts: {
		label: "Remises",
		color: "var(--chart-4)",
	},
	orders: {
		label: "Commandes",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

export function RevenueChart({
	chartData,
	periodLabel,
	chartMode = DEFAULT_CHART_MODE,
}: RevenueChartProps) {
	const { data } = chartData;
	const chartTitle = periodLabel ? `Revenus - ${periodLabel}` : "Revenus des 30 derniers jours";

	const router = useRouter();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();
	const [optimisticMode, setOptimisticMode] = useOptimistic<ChartMode>(chartMode);
	const isDetailed = optimisticMode === "detailed";

	function toggleMode() {
		triggerHaptic("selection");
		const next: ChartMode = isDetailed ? "simple" : "detailed";
		const params = new URLSearchParams(searchParams);
		if (next === DEFAULT_CHART_MODE) {
			params.delete(CHART_MODE_SEARCH_PARAM);
		} else {
			params.set(CHART_MODE_SEARCH_PARAM, next);
		}
		startTransition(() => {
			setOptimisticMode(next);
			const query = params.toString();
			router.push(query ? `?${query}` : ".", { scroll: false });
		});
	}

	const hasRevenue = data.some((item) => item.revenue > 0);
	const hasBreakdown = data.some((item) => item.subtotal > 0 || item.shipping > 0);

	// Screen reader summary
	const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
	const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
	const peakRevenue = data.reduce(
		(max, item) => (item.revenue > max.revenue ? item : max),
		data[0] ?? { date: "—", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
	);
	const peakOrders = data.reduce(
		(max, item) => (item.orders > max.orders ? item : max),
		data[0] ?? { date: "—", revenue: 0, orders: 0, subtotal: 0, discounts: 0, shipping: 0 },
	);

	const chartConfig = isDetailed ? detailedChartConfig : simpleChartConfig;

	return (
		<section
			className={cn(
				"space-y-3",
				"md:border-primary/30 md:from-primary/5 md:can-hover:hover:shadow-lg md:rounded-xl md:border-l-4 md:bg-linear-to-br md:to-transparent md:p-6 md:shadow-md md:transition-all md:duration-300",
			)}
			aria-labelledby="revenue-chart-title"
		>
			<header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3 id="revenue-chart-title" className={cn(CHART_STYLES.title, "text-base md:text-xl")}>
						{chartTitle}
					</h3>
					<p className={cn(CHART_STYLES.description, "text-xs md:text-sm")}>
						{isDetailed
							? "Décomposition : produits, livraison et remises"
							: "Chiffre d'affaires et nombre de commandes"}
					</p>
				</div>
				{hasBreakdown && (
					<Button
						variant="ghost"
						onClick={toggleMode}
						aria-pressed={isDetailed}
						className={cn(CHART_STYLES.touchTarget.button, "self-end text-xs sm:self-auto")}
					>
						{isDetailed ? "Vue simple" : "Détailler"}
					</Button>
				)}
			</header>
			<div>
				{!hasRevenue ? (
					<ChartEmpty type="noRevenue" minHeight={300} />
				) : (
					<div
						role="figure"
						aria-labelledby="revenue-chart-title"
						aria-describedby="revenue-chart-description"
					>
						<div id="revenue-chart-description" className="sr-only">
							<p>
								Graphique montrant l&apos;evolution du chiffre d&apos;affaires quotidien et du
								nombre de commandes sur les 30 derniers jours.
							</p>
							<p>Total revenus sur la période : {totalRevenue.toFixed(2)} €.</p>
							<p>Total commandes sur la période : {totalOrders}.</p>
							<p>
								Pic revenus : {peakRevenue.revenue.toFixed(2)} € le {peakRevenue.date}.
							</p>
							<p>
								Pic commandes : {peakOrders.orders} le {peakOrders.date}.
							</p>
						</div>
						<ChartScrollContainer>
							<ChartContainer
								config={chartConfig}
								className={cn(CHART_STYLES.height.responsive, "w-full")}
							>
								<ComposedChart
									accessibilityLayer
									data={data}
									margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
									onClick={(state) => {
										if (
											"activeTooltipIndex" in state &&
											typeof state.activeTooltipIndex === "number"
										) {
											triggerHaptic("selection");
										}
									}}
								>
									<defs>
										<linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
											<stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
										</linearGradient>
										<linearGradient id="subtotalGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="var(--color-subtotal)" stopOpacity={0.3} />
											<stop offset="95%" stopColor="var(--color-subtotal)" stopOpacity={0} />
										</linearGradient>
										<linearGradient id="shippingGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="var(--color-shipping)" stopOpacity={0.2} />
											<stop offset="95%" stopColor="var(--color-shipping)" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="date"
										tickLine={false}
										axisLine={false}
										tickMargin={8}
										interval="preserveStartEnd"
										tick={{ fontSize: 11 }}
										minTickGap={30}
									/>
									<YAxis yAxisId="revenue" hide />
									<YAxis yAxisId="orders" orientation="right" hide />
									<ChartTooltip
										cursor={{
											stroke: "var(--color-primary)",
											strokeWidth: 1.5,
											strokeDasharray: "3 3",
											strokeOpacity: 0.6,
										}}
										content={
											<ChartTooltipContent
												labelFormatter={(value) => `Date: ${value}`}
												formatter={(value, name) => {
													if (name === "orders") {
														return `${Number(value)} commande${Number(value) > 1 ? "s" : ""}`;
													}
													return `${(Number(value) / 100).toFixed(2)} €`;
												}}
											/>
										}
									/>
									<ChartLegend
										content={(props) => (
											<ChartLegendContent
												payload={props.payload}
												verticalAlign={props.verticalAlign}
											/>
										)}
									/>

									{/*
									 * Colorblind safety: each overlaid series uses a distinct stroke pattern
									 * so they remain distinguishable without relying on color alone (WCAG 1.4.1).
									 *   subtotal  → solid         shipping  → 6 2 dashed
									 *   discounts → 4 4 dashed    orders    → 2 2 dotted
									 */}
									{isDetailed ? (
										<>
											<Area
												yAxisId="revenue"
												dataKey="subtotal"
												type="monotone"
												stroke="var(--color-subtotal)"
												fill="url(#subtotalGradient)"
												strokeWidth={2}
											/>
											<Area
												yAxisId="revenue"
												dataKey="shipping"
												type="monotone"
												stroke="var(--color-shipping)"
												fill="url(#shippingGradient)"
												strokeWidth={1.5}
												strokeDasharray="6 2"
											/>
											<Line
												yAxisId="revenue"
												dataKey="discounts"
												type="monotone"
												stroke="var(--color-discounts)"
												strokeWidth={1.5}
												strokeDasharray="4 4"
												dot={false}
											/>
										</>
									) : (
										<Area
											yAxisId="revenue"
											dataKey="revenue"
											type="monotone"
											stroke="var(--color-revenue)"
											fill="url(#revenueGradient)"
											strokeWidth={2}
										/>
									)}

									<Line
										yAxisId="orders"
										dataKey="orders"
										type="monotone"
										stroke="var(--color-orders)"
										strokeWidth={1.5}
										strokeDasharray="2 2"
										dot={false}
									/>
								</ComposedChart>
							</ChartContainer>
						</ChartScrollContainer>
						<p className="text-muted-foreground text-2xs mt-2 md:hidden" aria-hidden="true">
							Touchez le graphique pour voir le détail.
						</p>
					</div>
				)}
			</div>
		</section>
	);
}
