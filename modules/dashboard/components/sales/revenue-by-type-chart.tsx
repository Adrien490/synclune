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
import type { GetRevenueByTypeReturn } from "../../types/dashboard.types";
import { CHART_STYLES } from "../../constants/chart-styles";
import { useChartDrilldown, type ChartDrilldownProps } from "../../hooks";

interface RevenueByTypeChartProps extends ChartDrilldownProps {
	dataPromise: Promise<GetRevenueByTypeReturn>;
}

const CHART_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
] as const;

/**
 * Graphique des revenus par type de produit
 */
export function RevenueByTypeChart({ dataPromise, enableDrilldown = true }: RevenueByTypeChartProps) {
	const data = use(dataPromise);
	const { handleClick } = useChartDrilldown("revenueByType");

	// Preparer les donnees pour le graphique avec une cle unique
	const chartData = useMemo(() => {
		const items = data.types.map((t, index) => ({
			key: `type-${index}`,
			name: t.typeLabel,
			value: t.revenue / 100,
			orders: t.ordersCount,
			units: t.unitsSold,
			fill: `var(--color-type-${index})`,
		}));

		// Ajouter les non-categorises si > 0
		if (data.uncategorizedRevenue > 0) {
			items.push({
				key: "uncategorized",
				name: "Non categorise",
				value: data.uncategorizedRevenue / 100,
				orders: 0,
				units: 0,
				fill: "var(--color-uncategorized)",
			});
		}

		return items;
	}, [data]);

	// Handler pour le clic sur un segment
	const onSegmentClick = (index: number) => {
		if (!enableDrilldown) return;
		const item = chartData[index];
		if (item && item.name !== "Non categorise") {
			handleClick(item.name);
		}
	};

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
			<Card className={CHART_STYLES.card}>
				<CardHeader>
					<CardTitle className={CHART_STYLES.title}>Revenus par type</CardTitle>
					<CardDescription className={CHART_STYLES.description}>Aucune vente sur cette periode</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const total = chartData.reduce((sum, item) => sum + item.value, 0);

	return (
		<Card className={CHART_STYLES.card}>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Revenus par type de bijou</CardTitle>
				<CardDescription className={CHART_STYLES.description}>
					Total: {(data.totalRevenue / 100).toFixed(2)} €
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div role="figure" aria-label="Graphique des revenus par type de bijou">
					<span className="sr-only">
						Graphique en secteurs montrant la repartition du chiffre d'affaires par type de bijou
					</span>
					<ChartContainer config={chartConfig} className={`${CHART_STYLES.height.default} w-full`}>
						<PieChart accessibilityLayer>
							<ChartTooltip
								content={
									<ChartTooltipContent
										hideLabel
										formatter={(value, name, item) => {
											const percentage = ((Number(value) / total) * 100).toFixed(1);
											return [`${Number(value).toFixed(2)} € (${percentage}%)`, item.payload.name];
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
