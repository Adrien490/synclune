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
import type { GetFulfillmentStatusReturn, FulfillmentStatusCount } from "@/modules/dashboard/types/dashboard.types";
import { use } from "react";
import { Cell, Pie, PieChart } from "recharts";

interface FulfillmentStatusChartProps {
	chartPromise: Promise<GetFulfillmentStatusReturn>;
}

const STATUS_LABELS: Record<string, string> = {
	UNFULFILLED: "Non traite",
	PROCESSING: "En cours",
	SHIPPED: "Expedie",
	DELIVERED: "Livre",
	RETURNED: "Retourne",
};

const chartConfig = {
	UNFULFILLED: {
		label: "Non traite",
		color: "var(--chart-1)",
	},
	PROCESSING: {
		label: "En cours",
		color: "var(--chart-2)",
	},
	SHIPPED: {
		label: "Expedie",
		color: "var(--chart-3)",
	},
	DELIVERED: {
		label: "Livre",
		color: "var(--chart-4)",
	},
	RETURNED: {
		label: "Retourne",
		color: "var(--chart-5)",
	},
} satisfies ChartConfig;

export function FulfillmentStatusChart({ chartPromise }: FulfillmentStatusChartProps) {
	const { statuses } = use(chartPromise);

	// Formater les donnees pour le chart
	const chartData = statuses.map((item: FulfillmentStatusCount) => ({
		status: item.status,
		count: item.count,
		label: STATUS_LABELS[item.status] || item.status,
		fill: `var(--color-${item.status})`,
	}));

	const total = statuses.reduce((sum, item) => sum + item.count, 0);

	return (
		<Card className="border-l-4 border-primary/30 bg-gradient-to-br from-primary/3 to-transparent hover:shadow-lg transition-all duration-300">
			<CardHeader>
				<CardTitle className="text-xl font-semibold tracking-wide">Statuts de livraison</CardTitle>
				<CardDescription className="text-sm">
					Repartition des commandes par statut de fulfillment
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="min-h-[300px] w-full aspect-square mx-auto">
					<PieChart>
						<ChartTooltip
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value, name, item) => {
										const percentage = ((Number(value) / total) * 100).toFixed(1);
										return [
											`${value} (${percentage}%)`,
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
			</CardContent>
		</Card>
	);
}
