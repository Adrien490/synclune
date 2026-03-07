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
import { formatChartData } from "@/modules/dashboard/services/revenue-chart-builder.service";

import { cn } from "@/shared/utils/cn";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { ChartEmpty } from "./chart-empty";
import { ChartScrollContainer } from "./chart-scroll-container";
import { CHART_STYLES } from "../constants/chart-styles";

interface RevenueChartProps {
	chartData: GetRevenueChartReturn;
}

/**
 * ℹ️ Micro-entreprise : Configuration simplifiée sans HT/TVA
 * Affiche uniquement le chiffre d'affaires (pas de TVA)
 */
const chartConfig = {
	revenue: {
		label: "Chiffre d'affaires",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function RevenueChart({ chartData }: RevenueChartProps) {
	const { data } = chartData;

	const formattedData = formatChartData(data);

	// Verifier s'il y a des donnees avec du revenu
	const hasRevenue = formattedData.some((item) => item.revenue > 0);

	// Résumé textuel pour lecteurs d'écran sans support SVG
	const totalRevenue = formattedData.reduce((sum, item) => sum + item.revenue, 0);
	const peakEntry = formattedData.reduce(
		(max, item) => (item.revenue > max.revenue ? item : max),
		formattedData[0] ?? { date: "—", revenue: 0 },
	);

	return (
		<Card
			className={cn(CHART_STYLES.card, "can-hover:hover:shadow-lg transition-all duration-300")}
		>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Revenus des 30 derniers jours</CardTitle>
				<CardDescription className={CHART_STYLES.description}>
					Évolution du chiffre d'affaires
				</CardDescription>
			</CardHeader>
			<CardContent>
				{!hasRevenue ? (
					<ChartEmpty type="noRevenue" minHeight={300} />
				) : (
					<div role="figure" aria-label="Graphique des revenus sur 30 jours">
						<div className="sr-only">
							<p>
								Graphique en ligne montrant l&apos;evolution du chiffre d&apos;affaires quotidien
								sur les 30 derniers jours.
							</p>
							<p>Total sur la période : {totalRevenue.toFixed(2)} €.</p>
							<p>
								Pic : {peakEntry.revenue.toFixed(2)} € le {peakEntry.date}.
							</p>
						</div>
						<ChartScrollContainer>
							<ChartContainer
								config={chartConfig}
								className={cn(CHART_STYLES.height.responsive, "w-full")}
							>
								<LineChart
									accessibilityLayer
									data={formattedData}
									margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
								>
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
									<ChartTooltip
										content={
											<ChartTooltipContent
												labelFormatter={(value) => `Date: ${value}`}
												formatter={(value) => `${Number(value).toFixed(2)} €`}
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
									<Line
										dataKey="revenue"
										type="monotone"
										stroke="var(--color-revenue)"
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ChartContainer>
						</ChartScrollContainer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
