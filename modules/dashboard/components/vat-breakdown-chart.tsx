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
import { GetDashboardVatBreakdownReturn, VatBreakdownItem } from "@/modules/dashboard/types";
import { use } from "react";
import { Cell, Pie, PieChart } from "recharts";

interface VatBreakdownChartProps {
	chartPromise: Promise<GetDashboardVatBreakdownReturn>;
}

const COLORS = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
];

export function VatBreakdownChart({ chartPromise }: VatBreakdownChartProps) {
	const { breakdown, total } = use(chartPromise);

	// Créer la config dynamiquement basée sur les taux
	const chartConfig = breakdown.reduce((config: ChartConfig, item: VatBreakdownItem, index: number) => {
		const key = `rate_${item.rate}`;
		config[key] = {
			label: `TVA ${item.rate}%`,
			color: COLORS[index % COLORS.length],
		};
		return config;
	}, {} as ChartConfig);

	// Formater les données pour le chart
	const chartData = breakdown.map((item: VatBreakdownItem, index: number) => ({
		rate: item.rate,
		amount: item.amount,
		orderCount: item.orderCount,
		label: `TVA ${item.rate}%`,
		fill: COLORS[index % COLORS.length],
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Répartition TVA collectée</CardTitle>
				<CardDescription>
					TVA du mois en cours par taux • Total: {total.toFixed(2)} €
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
											<div key="vat" className="flex flex-col gap-1">
												<span>{`${Number(value).toFixed(2)} € (${percentage}%)`}</span>
												<span className="text-xs text-muted-foreground">
													{item.payload.orderCount} commandes
												</span>
											</div>,
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
							dataKey="amount"
							nameKey="label"
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
