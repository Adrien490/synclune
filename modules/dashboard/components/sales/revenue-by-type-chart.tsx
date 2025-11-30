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
import type { GetRevenueByTypeReturn } from "../../types/dashboard.types";

interface RevenueByTypeChartProps {
	dataPromise: Promise<GetRevenueByTypeReturn>;
}

// Couleurs pour le pie chart
const COLORS = [
	"hsl(var(--primary))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
	"hsl(220, 70%, 50%)",
	"hsl(280, 70%, 50%)",
];

/**
 * Graphique des revenus par type de produit
 */
export function RevenueByTypeChart({ dataPromise }: RevenueByTypeChartProps) {
	const data = use(dataPromise);

	// Preparer les donnees pour le graphique
	const chartData = data.types.map((t) => ({
		name: t.typeLabel,
		value: t.revenue / 100,
		orders: t.ordersCount,
		units: t.unitsSold,
	}));

	// Ajouter les non-categorises si > 0
	if (data.uncategorizedRevenue > 0) {
		chartData.push({
			name: "Non categorise",
			value: data.uncategorizedRevenue / 100,
			orders: 0,
			units: 0,
		});
	}

	if (chartData.length === 0) {
		return (
			<Card className="border-l-4 border-primary/30">
				<CardHeader>
					<CardTitle className="text-lg">Revenus par type</CardTitle>
					<CardDescription>Aucune vente sur cette periode</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="border-l-4 border-primary/30">
			<CardHeader>
				<CardTitle className="text-lg">Revenus par type de bijou</CardTitle>
				<CardDescription>
					Total: {(data.totalRevenue / 100).toFixed(2)} €
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
							formatter={(value: number) => [`${value.toFixed(2)} €`, "CA"]}
						/>
						<Legend />
					</PieChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
