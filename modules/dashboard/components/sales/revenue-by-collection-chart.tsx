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
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import type { GetRevenueByCollectionReturn } from "../../types/dashboard.types";

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
		name: c.collectionName.length > 15
			? c.collectionName.slice(0, 15) + "..."
			: c.collectionName,
		revenue: c.revenue / 100,
		fullName: c.collectionName,
		orders: c.ordersCount,
		units: c.unitsSold,
	}));

	if (chartData.length === 0) {
		return (
			<Card className="border-l-4 border-primary/30">
				<CardHeader>
					<CardTitle className="text-lg">Revenus par collection</CardTitle>
					<CardDescription>Aucune vente sur cette periode</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="border-l-4 border-primary/30">
			<CardHeader>
				<CardTitle className="text-lg">Revenus par collection</CardTitle>
				<CardDescription>
					Top 5 des collections • Total: {(data.totalRevenue / 100).toFixed(2)} €
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={250}>
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
						<Tooltip
							formatter={(value: number) => [`${value.toFixed(2)} €`, "CA"]}
							labelFormatter={(label, payload) => {
								if (payload && payload[0]) {
									const item = payload[0].payload;
									return `${item.fullName} (${item.orders} cmd, ${item.units} unites)`;
								}
								return label;
							}}
						/>
						<Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
