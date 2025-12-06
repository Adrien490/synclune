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
	type ChartConfig,
} from "@/shared/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import type { GetStockByColorReturn } from "../../types/dashboard.types";
import { truncateText, TRUNCATE_PRESETS } from "../../utils/truncate-text";
import { CHART_STYLES } from "../../constants/chart-styles";
import { ChartScrollContainer } from "../chart-scroll-container";
import { useChartDrilldown, useYAxisWidth, type ChartDrilldownProps } from "../../hooks";

interface StockByColorChartProps extends ChartDrilldownProps {
	chartDataPromise: Promise<GetStockByColorReturn>;
}

/**
 * Graphique du stock par couleur
 */
export function StockByColorChart({ chartDataPromise, enableDrilldown = true }: StockByColorChartProps) {
	const data = use(chartDataPromise);
	const { handleClick } = useChartDrilldown("stockByColor");
	const yAxisWidth = useYAxisWidth("compact");

	// Preparer les donnees pour le graphique (top 8) avec une cle unique
	const chartData = (() => {
		const items: {
			key: string;
			colorId: string | null;
			name: string;
			fullName: string;
			units: number;
			value: number;
			color: string;
			skus: number;
		}[] = data.colors.slice(0, 8).map((c, index) => ({
			key: `color-${index}`,
			colorId: c.id,
			name: truncateText(c.name, TRUNCATE_PRESETS.badge),
			fullName: c.name,
			units: c.totalUnits,
			value: c.value / 100,
			color: c.hex || "var(--chart-1)",
			skus: c.skuCount,
		}));

		// Ajouter non categorise si significatif
		if (data.uncategorized.totalUnits > 0) {
			items.push({
				key: "uncategorized",
				colorId: null,
				name: "Sans couleur",
				fullName: "Sans couleur",
				units: data.uncategorized.totalUnits,
				value: data.uncategorized.value / 100,
				color: "var(--muted-foreground)",
				skus: 0,
			});
		}

		return items;
	})();

	// Handler pour le clic sur une barre
	const onBarClick = (data: unknown) => {
		if (!enableDrilldown) return;
		const entry = data as { colorId?: string | null };
		if (!entry?.colorId) return;
		handleClick(entry.colorId);
	};

	// Generer la config dynamiquement avec les couleurs hex reelles
	const chartConfig = (() => {
		const config: ChartConfig = {};
		chartData.forEach((item) => {
			config[item.key] = {
				label: item.fullName,
				color: item.color,
			};
		});
		return config;
	})();

	if (chartData.length === 0) {
		return (
			<Card className={CHART_STYLES.card}>
				<CardHeader>
					<CardTitle className={CHART_STYLES.title}>Stock par couleur</CardTitle>
					<CardDescription className={CHART_STYLES.description}>Aucun stock disponible</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	// Calculer le total
	const totalUnits = chartData.reduce((sum, c) => sum + c.units, 0);

	return (
		<Card className={CHART_STYLES.card}>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Stock par couleur</CardTitle>
				<CardDescription className={CHART_STYLES.description}>
					{totalUnits} unites au total
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div role="figure" aria-label="Graphique du stock par couleur">
					<span className="sr-only">
						Graphique en barres horizontales montrant la repartition du stock par couleur de bijou
					</span>
					<ChartScrollContainer>
						<ChartContainer config={chartConfig} className={`${CHART_STYLES.height.default} w-full`}>
							<BarChart
								accessibilityLayer
								data={chartData}
								layout="vertical"
								margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
							>
								<CartesianGrid strokeDasharray="3 3" horizontal={false} />
								<XAxis type="number" />
								<YAxis
									type="category"
									dataKey="name"
									width={yAxisWidth}
									tick={{ fontSize: 12 }}
								/>
								<ChartTooltip
									content={
										<ChartTooltipContent
											formatter={(value, name, item) => {
												const entry = item.payload;
												return [
													`${value} unites (${entry.value.toFixed(2)} €)`,
													entry.fullName,
												];
											}}
										/>
									}
								/>
								<Bar
									dataKey="units"
									radius={[0, 4, 4, 0]}
									onClick={(data) => onBarClick(data)}
									className={enableDrilldown ? "cursor-pointer" : ""}
								>
									{chartData.map((entry) => (
										<Cell
											key={entry.key}
											fill={entry.color}
											className={enableDrilldown ? "hover:opacity-80 transition-opacity" : ""}
										/>
									))}
								</Bar>
							</BarChart>
						</ChartContainer>
					</ChartScrollContainer>
				</div>
			</CardContent>
		</Card>
	);
}
