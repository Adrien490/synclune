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
import type { GetDashboardRevenueChartReturn, RevenueDataPoint } from "@/modules/dashboard/data/get-revenue-chart";
import { use } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { ChartEmpty } from "./chart-empty";
import { ChartScrollContainer } from "./chart-scroll-container";
import { CHART_STYLES } from "../constants/chart-styles";

interface RevenueChartProps {
	chartDataPromise: Promise<GetDashboardRevenueChartReturn>;
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

export function RevenueChart({ chartDataPromise }: RevenueChartProps) {
	const { data } = use(chartDataPromise);

	// Formater les données pour le chart
	const chartData = data.map((item: RevenueDataPoint) => ({
		date: new Date(item.date).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "short",
		}),
		revenue: item.revenue,
	}));

	// Verifier s'il y a des donnees avec du revenu
	const hasRevenue = chartData.some((item) => item.revenue > 0);

	return (
		<Card className={`${CHART_STYLES.card} hover:shadow-lg transition-all duration-300`}>
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
						<span className="sr-only">
							Graphique en ligne montrant l'evolution du chiffre d'affaires quotidien sur les 30 derniers jours
						</span>
						<ChartScrollContainer>
							<ChartContainer config={chartConfig} className={`${CHART_STYLES.height.responsive} w-full`}>
								<LineChart accessibilityLayer
								data={chartData}
								margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="date"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
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
