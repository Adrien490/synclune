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
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/shared/components/ui/chart";
import type { GetDashboardTopProductsReturn, TopProductItem } from "@/modules/dashboard/data/get-top-products";
import { use } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { truncateText, TRUNCATE_PRESETS } from "../utils/truncate-text";
import { CHART_STYLES } from "../constants/chart-styles";

interface TopProductsChartProps {
	chartPromise: Promise<GetDashboardTopProductsReturn>;
}

const chartConfig = {
	revenue: {
		label: "Chiffre d'affaires",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function TopProductsChart({ chartPromise }: TopProductsChartProps) {
	const { products } = use(chartPromise);

	// Formater les données pour le chart
	const chartData = products.map((product: TopProductItem) => ({
		product: truncateText(product.productTitle, TRUNCATE_PRESETS.chart),
		fullName: product.productTitle,
		revenue: product.revenue,
		unitsSold: product.unitsSold,
	}));

	return (
		<Card className={`${CHART_STYLES.card} hover:shadow-lg transition-all duration-300`}>
			<CardHeader>
				<CardTitle className={CHART_STYLES.title}>Top 5 bijoux vendus</CardTitle>
				<CardDescription className={CHART_STYLES.description}>
					Classement par chiffre d'affaires (30 derniers jours)
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className={`${CHART_STYLES.height.default} w-full`}>
					<BarChart accessibilityLayer data={chartData} layout="vertical">
						<CartesianGrid horizontal={false} />
						<YAxis
							dataKey="product"
							type="category"
							tickLine={false}
							axisLine={false}
							width={150}
						/>
						<XAxis type="number" hide />
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(_, payload) => {
										if (payload && payload[0]) {
											return payload[0].payload.fullName;
										}
										return "";
									}}
									formatter={(value, name, item) => {
										if (name === "revenue") {
											return [
												<div key="revenue" className="flex flex-col gap-1">
													<span>{`${Number(value).toFixed(2)} €`}</span>
													<span className="text-xs text-muted-foreground">
														{item.payload.unitsSold} unités vendues
													</span>
												</div>,
												"CA",
											];
										}
										return [value, name];
									}}
								/>
							}
						/>
						<Bar
							dataKey="revenue"
							fill="var(--color-revenue)"
							radius={[0, 4, 4, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
