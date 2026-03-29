"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "./chart";
import { Button } from "@/shared/components/ui/button";
import type { GetRevenueChartReturn } from "@/modules/dashboard/data/get-revenue-chart";

import { cn } from "@/shared/utils/cn";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartEmpty } from "./chart-empty";
import { ChartScrollContainer } from "./chart-scroll-container";
import { CHART_STYLES } from "../constants/chart-styles";

interface RevenueChartProps {
	chartData: GetRevenueChartReturn;
	periodLabel?: string;
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

export function RevenueChart({ chartData, periodLabel }: RevenueChartProps) {
	const { data } = chartData;
	const chartTitle = periodLabel ? `Revenus - ${periodLabel}` : "Revenus des 30 derniers jours";
	const [isDetailed, setIsDetailed] = useState(false);

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
		<Card
			className={cn(CHART_STYLES.card, "can-hover:hover:shadow-lg transition-all duration-300")}
		>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className={CHART_STYLES.title}>{chartTitle}</CardTitle>
						<CardDescription className={CHART_STYLES.description}>
							{isDetailed
								? "Décomposition : produits, livraison et remises"
								: "Chiffre d'affaires et nombre de commandes"}
						</CardDescription>
					</div>
					{hasBreakdown && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsDetailed((prev) => !prev)}
							className="text-xs"
						>
							{isDetailed ? "Vue simple" : "Détailler"}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{!hasRevenue ? (
					<ChartEmpty type="noRevenue" minHeight={300} />
				) : (
					<div role="figure" aria-label={`Graphique des revenus et commandes - ${chartTitle}`}>
						<div className="sr-only">
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
										strokeDasharray="4 4"
										dot={false}
									/>
								</ComposedChart>
							</ChartContainer>
						</ChartScrollContainer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
