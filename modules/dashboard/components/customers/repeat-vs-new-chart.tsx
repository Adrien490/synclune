"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/shared/components/ui/chart";
import type { RepeatCustomersReturn } from "../../types/dashboard.types";
import { use } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { CHART_STYLES } from "../../constants/chart-styles";

interface RepeatVsNewChartProps {
	chartDataPromise: Promise<RepeatCustomersReturn>;
}

const chartConfig = {
	oneTime: {
		label: "Nouveaux clients",
		color: "var(--chart-1)",
	},
	repeat: {
		label: "Clients recurrents",
		color: "var(--chart-4)",
	},
} satisfies ChartConfig;

export function RepeatVsNewChart({ chartDataPromise }: RepeatVsNewChartProps) {
	const data = use(chartDataPromise);

	const chartData = [
		{
			type: "oneTime",
			count: data.oneTimeCustomers,
			label: "Nouveaux clients",
			fill: "var(--color-oneTime)",
		},
		{
			type: "repeat",
			count: data.repeatCustomers,
			label: "Clients recurrents",
			fill: "var(--color-repeat)",
		},
	];

	const total = data.totalCustomers;

	if (total === 0) {
		return (
			<Card className="border-l-4 border-primary/30">
				<CardHeader>
					<CardTitle className="text-lg">Repartition des clients</CardTitle>
					<CardDescription>Aucun client sur cette periode</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className={`${CHART_STYLES.card} hover:shadow-lg transition-all duration-300`}>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Repartition des clients</CardTitle>
				<CardDescription className="text-sm">
					Nouveaux vs recurrents • Taux de recurrence: {data.repeatRate.toFixed(1)}%
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div role="figure" aria-label="Graphique de repartition des clients">
					<span className="sr-only">
						Graphique en secteurs montrant la repartition entre nouveaux clients et clients recurrents
					</span>
					<ChartContainer config={chartConfig} className={`${CHART_STYLES.height.pie} ${CHART_STYLES.pie.container}`}>
						<PieChart accessibilityLayer>
							<ChartTooltip
								content={
									<ChartTooltipContent
										hideLabel
										formatter={(value, name, item) => {
											const percentage = ((Number(value) / total) * 100).toFixed(1);
											return [
												`${value} clients (${percentage}%)`,
												item.payload.label,
											];
										}}
									/>
								}
							/>
							<ChartLegend
								verticalAlign="bottom"
								content={(props) => (
									<ChartLegendContent
										payload={props.payload}
										verticalAlign={props.verticalAlign}
										nameKey="label"
									/>
								)}
							/>
							<Pie
								data={chartData}
								dataKey="count"
								nameKey="label"
								innerRadius={60}
								strokeWidth={5}
							>
								{chartData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={entry.fill} />
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
				</div>
			</CardContent>
		</Card>
	);
}
