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
	Cell,
} from "recharts";
import type { GetStockByColorReturn } from "../../types/dashboard.types";

interface StockByColorChartProps {
	dataPromise: Promise<GetStockByColorReturn>;
}

/**
 * Graphique du stock par couleur
 */
export function StockByColorChart({ dataPromise }: StockByColorChartProps) {
	const data = use(dataPromise);

	// Preparer les donnees pour le graphique (top 8)
	const chartData = data.colors.slice(0, 8).map((c) => ({
		name: c.name.length > 12 ? c.name.slice(0, 12) + "..." : c.name,
		fullName: c.name,
		units: c.totalUnits,
		value: c.value / 100,
		color: c.hex || "hsl(var(--primary))",
		skus: c.skuCount,
	}));

	// Ajouter non categorise si significatif
	if (data.uncategorized.totalUnits > 0) {
		chartData.push({
			name: "Sans couleur",
			fullName: "Sans couleur",
			units: data.uncategorized.totalUnits,
			value: data.uncategorized.value / 100,
			color: "hsl(var(--muted-foreground))",
			skus: 0,
		});
	}

	if (chartData.length === 0) {
		return (
			<Card className="border-l-4 border-primary/30">
				<CardHeader>
					<CardTitle className="text-lg">Stock par couleur</CardTitle>
					<CardDescription>Aucun stock disponible</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	// Calculer le total
	const totalUnits = chartData.reduce((sum, c) => sum + c.units, 0);

	return (
		<Card className="border-l-4 border-primary/30">
			<CardHeader>
				<CardTitle className="text-lg">Stock par couleur</CardTitle>
				<CardDescription>
					{totalUnits} unites au total
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
						<XAxis type="number" />
						<YAxis
							type="category"
							dataKey="name"
							width={80}
							tick={{ fontSize: 12 }}
						/>
						<Tooltip
							formatter={(value: number, name: string) => {
								if (name === "units") return [value, "Unites"];
								return [`${value.toFixed(2)} €`, "Valeur"];
							}}
							labelFormatter={(label, payload) => {
								if (payload && payload[0]) {
									const item = payload[0].payload;
									return `${item.fullName}`;
								}
								return label;
							}}
						/>
						<Bar dataKey="units" radius={[0, 4, 4, 0]}>
							{chartData.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={entry.color} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
