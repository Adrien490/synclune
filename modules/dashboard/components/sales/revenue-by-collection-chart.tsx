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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { GetRevenueByCollectionReturn } from "../../types/dashboard.types";
import { truncateText, TRUNCATE_PRESETS } from "../../utils/truncate-text";
import { CHART_STYLES } from "../../constants/chart-styles";

const chartConfig = {
	revenue: {
		label: "Chiffre d'affaires",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

interface RevenueByCollectionChartProps {
	dataPromise: Promise<GetRevenueByCollectionReturn>;
}

/**
 * Graphique des revenus par collection
 */
export function RevenueByCollectionChart({
	dataPromise,
}: RevenueByCollectionChartProps) {
	const data = use(dataPromise);

	// Preparer les donnees pour le graphique (top 5)
	const chartData = data.collections.slice(0, 5).map((c) => ({
		name: truncateText(c.collectionName, TRUNCATE_PRESETS.collection),
		revenue: c.revenue / 100,
		fullName: c.collectionName,
		orders: c.ordersCount,
		units: c.unitsSold,
	}));

	if (chartData.length === 0) {
		return (
			<Card className={CHART_STYLES.card}>
				<CardHeader>
					<CardTitle className={CHART_STYLES.title}>Revenus par collection</CardTitle>
					<CardDescription className={CHART_STYLES.description}>Aucune vente sur cette periode</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className={CHART_STYLES.card}>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Revenus par collection</CardTitle>
				<CardDescription className={CHART_STYLES.description}>
					Top 5 des collections • Total: {(data.totalRevenue / 100).toFixed(2)} €
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className={`${CHART_STYLES.height.default} w-full`}>
					<BarChart
						data={chartData}
						layout="vertical"
						margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
					>
						<CartesianGrid strokeDasharray="3 3" horizontal={false} />
						<XAxis type="number" tickFormatter={(v) => `${v}€`} />
						<YAxis
							type="category"
							dataKey="name"
							width={100}
							tick={{ fontSize: 12 }}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(value, name, item) => {
										const entry = item.payload;
										return [
											`${Number(value).toFixed(2)} € (${entry.orders} cmd, ${entry.units} unites)`,
											entry.fullName,
										];
									}}
								/>
							}
						/>
						<Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
