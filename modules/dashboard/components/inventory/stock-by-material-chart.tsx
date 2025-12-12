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
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from "@/shared/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import type { GetStockByMaterialReturn } from "../../types/dashboard.types";
import { CHART_STYLES } from "../../constants/chart-styles";
import { useChartDrilldown, type ChartDrilldownProps } from "../../hooks/use-chart-drilldown";

interface StockByMaterialChartProps extends ChartDrilldownProps {
	chartDataPromise: Promise<GetStockByMaterialReturn>;
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
export function StockByMaterialChart({ chartDataPromise, enableDrilldown = true }: StockByMaterialChartProps) {
	const data = use(chartDataPromise);
	const { handleClick } = useChartDrilldown("stockByMaterial");

	// Preparer les donnees pour le graphique avec une cle unique
	const chartData = (() => {
		const items: {
			key: string;
			materialId: string | null;
			name: string;
			value: number;
			stockValue: number;
			skus: number;
			fill: string;
		}[] = data.materials.map((m, index) => ({
			key: `material-${index}`,
			materialId: m.id,
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
				materialId: null,
				name: "Sans materiau",
				value: data.uncategorized.totalUnits,
				stockValue: data.uncategorized.value / 100,
				skus: 0,
				fill: "var(--color-uncategorized)",
			});
		}

		return items;
	})();

	// Handler pour le clic sur un segment
	const onSegmentClick = (index: number) => {
		if (!enableDrilldown) return;
		const item = chartData[index];
		if (item?.materialId) {
			handleClick(item.materialId);
		}
	};

	// Generer la config dynamiquement
	const chartConfig = (() => {
		const config: ChartConfig = {};
		chartData.forEach((item, index) => {
			config[item.key] = {
				label: item.name,
				color: CHART_COLORS[index % CHART_COLORS.length],
			};
		});
		return config;
	})();

	if (chartData.length === 0) {
		return (
			<Card className={CHART_STYLES.card}>
				<CardHeader>
					<CardTitle className={CHART_STYLES.title}>Stock par materiau</CardTitle>
					<CardDescription className={CHART_STYLES.description}>Aucun stock disponible</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	// Calculer le total
	const totalUnits = chartData.reduce((sum, m) => sum + m.value, 0);

	return (
		<Card className={CHART_STYLES.card}>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Stock par materiau</CardTitle>
				<CardDescription className={CHART_STYLES.description}>
					{totalUnits} unites au total
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div role="figure" aria-label="Graphique du stock par materiau">
					<span className="sr-only">
						Graphique en secteurs montrant la repartition du stock par materiau de bijou
					</span>
					<ChartContainer config={chartConfig} className={`${CHART_STYLES.height.pie} ${CHART_STYLES.pie.container}`}>
						<PieChart accessibilityLayer>
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
								onClick={(_, index) => onSegmentClick(index)}
								className={enableDrilldown ? "cursor-pointer" : ""}
							>
								{chartData.map((entry) => (
									<Cell
										key={entry.key}
										fill={entry.fill}
										className={enableDrilldown ? "hover:opacity-80 transition-opacity" : ""}
									/>
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
				</div>
			</CardContent>
		</Card>
	);
}
