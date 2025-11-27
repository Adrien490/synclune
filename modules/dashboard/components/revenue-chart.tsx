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
import { GetDashboardRevenueChartReturn, RevenueDataPoint } from "@/modules/dashboard/types";
import { use } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

interface RevenueChartProps {
	chartPromise: Promise<GetDashboardRevenueChartReturn>;
}

/**
 * ℹ️ Micro-entreprise : Configuration simplifiée sans HT/TVA
 * Affiche uniquement le chiffre d'affaires (pas de TVA)
 */
const chartConfig = {
	revenue: {
		label: "Chiffre d'affaires",
		color: "hsl(var(--chart-1))",
	},
} satisfies ChartConfig;

export function RevenueChart({ chartPromise }: RevenueChartProps) {
	const { data } = use(chartPromise);

	// Formater les données pour le chart
	const chartData = data.map((item: RevenueDataPoint) => ({
		date: new Date(item.date).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "short",
		}),
		revenue: item.revenue,
	}));

	return (
		<Card className="border-t-4 border-primary/30 bg-gradient-to-br from-primary/3 to-transparent hover:shadow-lg transition-all duration-300">
			<CardHeader>
				<CardTitle className="text-xl font-semibold tracking-wide">Revenus des 30 derniers jours</CardTitle>
				<CardDescription className="text-sm">
					Évolution du chiffre d'affaires
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="min-h-[300px] w-full">
					<LineChart
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
			</CardContent>
		</Card>
	);
}
