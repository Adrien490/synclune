"use client";

import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Percent, Tag, ShoppingBag, AlertCircle } from "lucide-react";
import type { DiscountStatsReturn } from "../../types/dashboard.types";
import { CHART_STYLES } from "../../constants/chart-styles";

interface DiscountStatsCardProps {
	dataPromise: Promise<DiscountStatsReturn>;
}

function formatEvolution(evolution: number): string {
	const sign = evolution >= 0 ? "+" : "";
	return `${sign}${evolution.toFixed(1)}%`;
}

export function DiscountStatsCard({ dataPromise }: DiscountStatsCardProps) {
	const data = use(dataPromise);

	return (
		<Card className={`${CHART_STYLES.card} hover:shadow-lg transition-all duration-300`}>
			<CardHeader>
				<CardTitle className={`${CHART_STYLES.title} flex items-center gap-2`}>
					<Tag className="h-5 w-5 text-primary" />
					Codes promo
				</CardTitle>
				<CardDescription className="text-sm">
					Utilisation et impact des promotions
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4">
					{/* CA avec remise */}
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<ShoppingBag className="h-4 w-4" />
							CA avec remise
						</div>
						<p className="text-2xl font-bold">
							{data.revenueWithDiscount.amount.toFixed(2)} €
						</p>
						<p
							className={`text-xs ${
								data.revenueWithDiscount.evolution >= 0
									? CHART_STYLES.evolution.positive
									: CHART_STYLES.evolution.negative
							}`}
						>
							{formatEvolution(data.revenueWithDiscount.evolution)} vs periode prec.
						</p>
					</div>

					{/* Montant des remises */}
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Percent className="h-4 w-4" />
							Remises accordees
						</div>
						<p className="text-2xl font-bold text-orange-600">
							-{data.totalDiscountAmount.amount.toFixed(2)} €
						</p>
						<p
							className={`text-xs ${
								data.totalDiscountAmount.evolution >= 0
									? "text-orange-600"
									: CHART_STYLES.evolution.positive
							}`}
						>
							{formatEvolution(data.totalDiscountAmount.evolution)} vs periode prec.
						</p>
					</div>

					{/* Commandes avec remise */}
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Tag className="h-4 w-4" />
							Commandes
						</div>
						<p className="text-2xl font-bold">
							{data.ordersWithDiscount.count}
						</p>
						<p
							className={`text-xs ${
								data.ordersWithDiscount.evolution >= 0
									? CHART_STYLES.evolution.positive
									: CHART_STYLES.evolution.negative
							}`}
						>
							{formatEvolution(data.ordersWithDiscount.evolution)} vs periode prec.
						</p>
					</div>

					{/* Codes non utilises */}
					<div className="space-y-1">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<AlertCircle className="h-4 w-4" />
							Codes inutilises
						</div>
						<p className="text-2xl font-bold text-muted-foreground">
							{data.unusedCodes.count}
						</p>
						<p className="text-xs text-muted-foreground">
							codes actifs sans usage
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
