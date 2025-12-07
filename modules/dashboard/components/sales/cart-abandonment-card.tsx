"use client";

import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import type { CartAbandonmentReturn } from "../../types/dashboard.types";
import { CHART_STYLES } from "../../constants/chart-styles";

interface CartAbandonmentCardProps {
	dataPromise: Promise<CartAbandonmentReturn>;
}

/**
 * Carte affichant le taux d'abandon de panier
 * Note: Ce taux concerne uniquement les visiteurs anonymes (non connectes)
 */
export function CartAbandonmentCard({ dataPromise }: CartAbandonmentCardProps) {
	const data = use(dataPromise);

	// Pour le taux d'abandon, une baisse est une amelioration (moins d'abandons)
	const isImproved = data.evolution < 0;
	const evolutionColor = isImproved ? CHART_STYLES.evolution.positive : CHART_STYLES.evolution.negative;
	const EvolutionIcon = isImproved ? TrendingDown : TrendingUp;

	return (
		<Card className={CHART_STYLES.card}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div>
					<CardTitle className={CHART_STYLES.title}>
						Taux d'abandon de panier
					</CardTitle>
					<CardDescription className="text-xs mt-1">
						Visiteurs anonymes uniquement
					</CardDescription>
				</div>
				<ShoppingCart className="h-5 w-5 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div className="flex items-baseline gap-2">
					<span className="text-3xl font-bold">{data.rate.toFixed(1)}%</span>
					{data.evolution !== 0 && (
						<span className={cn("flex items-center text-sm font-medium", evolutionColor)}>
							<EvolutionIcon className="h-3 w-3 mr-1" />
							{Math.abs(data.evolution).toFixed(1)}%
						</span>
					)}
				</div>

				<div className="mt-4 grid grid-cols-3 gap-4 text-sm">
					<div>
						<p className="text-muted-foreground">Abandonnes</p>
						<p className={`font-medium ${CHART_STYLES.evolution.negative}`}>{data.abandonedCarts}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Convertis</p>
						<p className={`font-medium ${CHART_STYLES.evolution.positive}`}>{data.convertedCarts}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Total</p>
						<p className="font-medium">{data.totalCarts}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
