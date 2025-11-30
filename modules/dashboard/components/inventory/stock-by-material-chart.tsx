"use client";

import { use, useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from "@/shared/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import type { GetStockByMaterialReturn } from "../../types/dashboard.types";

interface StockByMaterialChartProps {
	dataPromise: Promise<GetStockByMaterialReturn>;
}

const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
] as const;

/**
 * Graphique du stock par materiau
 */
export function StockByMaterialChart({ dataPromise }: StockByMaterialChartProps) {
	const data = use(dataPromise);

	// Preparer les donnees pour le graphique avec une cle unique
	const chartData = useMemo(() => {
		const items = data.materials.map((m, index) => ({
			key: `material-${index}`,
			name: m.name,
			value: m.totalUnits,
			stockValue: m.value / 100,
			skus: m.skuCount,
			fill: `var(--color-material-${index})`,
		}));

		// Ajouter non categorise si significatif
		if (data.uncategorized.totalUnits > 0) {
			items.push({
				key: "uncategorized",
				name: "Sans materiau",
				value: data.uncategorized.totalUnits,
				stockValue: data.uncategorized.value / 100,
				skus: 0,
				fill: "var(--color-uncategorized)",
			});
		}

		return items;
	}, [data]);

	// Generer la config dynamiquement
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {};
		chartData.forEach((item, index) => {
			config[item.key] = {
				label: item.name,
				color: CHART_COLORS[index % CHART_COLORS.length],
			};
		});
		return config;
	}, [chartData]);

	if (chartData.length === 0) {
		return (
			<Card className="border-l-4 border-primary/30">
				<CardHeader>
					<CardTitle className="text-lg">Stock par materiau</CardTitle>
					<CardDescription>Aucun stock disponible</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	// Calculer le total
	const totalUnits = chartData.reduce((sum, m) => sum + m.value, 0);

	return (
		<Card className="border-l-4 border-primary/30">
			<CardHeader>
				<CardTitle className="text-lg">Stock par materiau</CardTitle>
				<CardDescription>
					{totalUnits} unites au total
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="min-h-[250px] w-full">
					<PieChart>
						<ChartTooltip
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value, name, item) => {
										const percentage = ((Number(value) / totalUnits) * 100).toFixed(1);
										return [
											`${value} unites (${percentage}%) - ${item.payload.stockValue.toFixed(2)} €`,
											item.payload.name,
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
									nameKey="name"
								/>
							)}
						/>
						<Pie
							data={chartData}
							cx="50%"
							cy="50%"
							innerRadius={60}
							outerRadius={80}
							paddingAngle={2}
							dataKey="value"
							nameKey="name"
						>
							{chartData.map((entry) => (
								<Cell key={entry.key} fill={entry.fill} />
							))}
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
