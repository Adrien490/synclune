"use client";

import { use } from "react";
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
import type { GetRevenueYearReturn } from "../types/dashboard.types";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ChartScrollContainer } from "./chart-scroll-container";
import { CHART_STYLES } from "../constants/chart-styles";

interface RevenueYearChartProps {
	chartDataPromise: Promise<GetRevenueYearReturn>;
}

const chartConfig = {
	revenue: {
		label: "Chiffre d'affaires",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function RevenueYearChart({ chartDataPromise }: RevenueYearChartProps) {
	const { data, totalRevenue, yoyEvolution } = use(chartDataPromise);

	const isPositive = yoyEvolution >= 0;

	return (
		<Card className={`${CHART_STYLES.card} hover:shadow-lg transition-all duration-300`}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className={CHART_STYLES.title}>
							Tendances 12 mois
						</CardTitle>
						<CardDescription className="text-sm">
							Evolution du chiffre d'affaires mensuel
						</CardDescription>
					</div>
					<div className="text-right">
						<p className="text-2xl font-bold">
							{totalRevenue.toLocaleString("fr-FR", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}{" "}
							€
						</p>
						<div
							className={`flex items-center gap-1 text-sm ${
								isPositive ? CHART_STYLES.evolution.positive : CHART_STYLES.evolution.negative
							}`}
						>
							{isPositive ? (
								<TrendingUp className="h-4 w-4" />
							) : (
								<TrendingDown className="h-4 w-4" />
							)}
							<span>
								{isPositive ? "+" : ""}
								{yoyEvolution.toFixed(1)}% vs annee prec.
							</span>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div role="figure" aria-label="Graphique des tendances sur 12 mois">
					<span className="sr-only">
						Graphique en barres montrant l'evolution mensuelle du chiffre d'affaires sur les 12 derniers mois
					</span>
					<ChartScrollContainer>
						<ChartContainer config={chartConfig} className="min-h-[300px] w-full">
							<BarChart
								accessibilityLayer
								data={data}
								margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
							>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="month"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								interval="preserveStartEnd"
								tick={{ fontSize: 11 }}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={4}
								width={45}
								tick={{ fontSize: 10 }}
								tickFormatter={(value) =>
									value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
								}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										labelFormatter={(value) => `Mois: ${value}`}
										formatter={(value, name, item) => {
											const ordersCount = item.payload.ordersCount;
											return [
												`${Number(value).toLocaleString("fr-FR", {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})} € (${ordersCount} cmd)`,
												"CA",
											];
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
							<Bar
								dataKey="revenue"
								fill="var(--color-revenue)"
								radius={[4, 4, 0, 0]}
							/>
							</BarChart>
						</ChartContainer>
					</ChartScrollContainer>
				</div>
			</CardContent>
		</Card>
	);
}
