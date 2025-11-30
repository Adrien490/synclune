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
	PieChart,
	Pie,
	Cell,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from "recharts";
import type { GetStockByMaterialReturn } from "../../types/dashboard.types";

interface StockByMaterialChartProps {
	dataPromise: Promise<GetStockByMaterialReturn>;
}

// Couleurs pour le pie chart
const COLORS = [
	"hsl(var(--primary))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
	"hsl(220, 70%, 50%)",
];

/**
 * Graphique du stock par materiau
 */
export function StockByMaterialChart({ dataPromise }: StockByMaterialChartProps) {
	const data = use(dataPromise);

	// Preparer les donnees pour le graphique
	const chartData = data.materials.map((m) => ({
		name: m.name,
		value: m.totalUnits,
		stockValue: m.value / 100,
		skus: m.skuCount,
	}));

	// Ajouter non categorise si significatif
	if (data.uncategorized.totalUnits > 0) {
		chartData.push({
			name: "Sans materiau",
			value: data.uncategorized.totalUnits,
			stockValue: data.uncategorized.value / 100,
			skus: 0,
		});
	}

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
				<ResponsiveContainer width="100%" height={250}>
					<PieChart>
						<Pie
							data={chartData}
							cx="50%"
							cy="50%"
							innerRadius={60}
							outerRadius={80}
							paddingAngle={2}
							dataKey="value"
						>
							{chartData.map((_, index) => (
								<Cell
									key={`cell-${index}`}
									fill={COLORS[index % COLORS.length]}
								/>
							))}
						</Pie>
						<Tooltip
							formatter={(value: number, name: string, props) => {
								const item = props.payload;
								return [
									`${value} unites (${item.stockValue.toFixed(2)} €)`,
									item.name,
								];
							}}
						/>
						<Legend />
					</PieChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
