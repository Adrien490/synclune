"use client";

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
} from "@/shared/components/ui/chart";
import type { GetRevenueChartReturn } from "@/modules/dashboard/data/get-revenue-chart";

import { cn } from "@/shared/utils/cn";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartEmpty } from "./chart-empty";
import { ChartScrollContainer } from "./chart-scroll-container";
import { CHART_STYLES } from "../constants/chart-styles";

interface RevenueChartProps {
	chartData: GetRevenueChartReturn;
}

const chartConfig = {
	revenue: {
		label: "Chiffre d'affaires",
		color: "var(--chart-1)",
	},
	orders: {
		label: "Commandes",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

export function RevenueChart({ chartData }: RevenueChartProps) {
	const { data } = chartData;

	const hasRevenue = data.some((item) => item.revenue > 0);

	// Screen reader summary
	const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
	const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
	const peakRevenue = data.reduce(
		(max, item) => (item.revenue > max.revenue ? item : max),
		data[0] ?? { date: "—", revenue: 0, orders: 0 },
	);
	const peakOrders = data.reduce(
		(max, item) => (item.orders > max.orders ? item : max),
		data[0] ?? { date: "—", revenue: 0, orders: 0 },
	);

	return (
		<Card
			className={cn(CHART_STYLES.card, "can-hover:hover:shadow-lg transition-all duration-300")}
		>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Revenus des 30 derniers jours</CardTitle>
				<CardDescription className={CHART_STYLES.description}>
					Chiffre d&apos;affaires et nombre de commandes
				</CardDescription>
			</CardHeader>
			<CardContent>
				{!hasRevenue ? (
					<ChartEmpty type="noRevenue" minHeight={300} />
				) : (
					<div role="figure" aria-label="Graphique des revenus et commandes sur 30 jours">
						<div className="sr-only">
							<p>
								Graphique montrant l&apos;evolution du chiffre d&apos;affaires quotidien et du
								nombre de commandes sur les 30 derniers jours.
							</p>
							<p>Total revenus sur la periode : {totalRevenue.toFixed(2)} €.</p>
							<p>Total commandes sur la periode : {totalOrders}.</p>
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
													return `${Number(value).toFixed(2)} €`;
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
									<Area
										yAxisId="revenue"
										dataKey="revenue"
										type="monotone"
										stroke="var(--color-revenue)"
										fill="url(#revenueGradient)"
										strokeWidth={2}
									/>
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
