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
import type { GetDashboardOrdersStatusReturn, OrderStatusItem } from "@/modules/dashboard/data/get-orders-status";
import { use } from "react";
import { Cell, Pie, PieChart } from "recharts";

interface OrdersStatusChartProps {
	chartPromise: Promise<GetDashboardOrdersStatusReturn>;
}

const STATUS_LABELS: Record<string, string> = {
	PENDING: "En attente",
	PROCESSING: "En traitement",
	SHIPPED: "Expédiée",
	DELIVERED: "Livrée",
	CANCELED: "Annulée",
	REFUNDED: "Remboursée",
};

const chartConfig = {
	PENDING: {
		label: "En attente",
		color: "var(--chart-1)",
	},
	PROCESSING: {
		label: "En traitement",
		color: "var(--chart-2)",
	},
	SHIPPED: {
		label: "Expédiée",
		color: "var(--chart-3)",
	},
	DELIVERED: {
		label: "Livrée",
		color: "var(--chart-4)",
	},
	CANCELED: {
		label: "Annulée",
		color: "var(--chart-5)",
	},
	REFUNDED: {
		label: "Remboursée",
		color: "oklch(0.9 0.02 250)",
	},
} satisfies ChartConfig;

export function OrdersStatusChart({ chartPromise }: OrdersStatusChartProps) {
	const { statuses } = use(chartPromise);

	// Formater les données pour le chart
	const chartData = statuses.map((item: OrderStatusItem) => ({
		status: item.status,
		count: item.count,
		label: STATUS_LABELS[item.status] || item.status,
		fill: `var(--color-${item.status})`,
	}));

	const total = statuses.reduce((sum, item) => sum + item.count, 0);

	return (
		<Card className="border-l-4 border-primary/30 bg-gradient-to-br from-primary/3 to-transparent hover:shadow-lg transition-all duration-300">
			<CardHeader>
				<CardTitle className="text-xl font-semibold tracking-wide">Statuts des commandes</CardTitle>
				<CardDescription className="text-sm">
					Répartition de toutes les commandes par statut
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
