"use client";

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import type { CartAbandonmentReturn } from "../../types/dashboard.types";

interface CartAbandonmentCardProps {
	dataPromise: Promise<CartAbandonmentReturn>;
}

/**
 * Carte affichant le taux d'abandon de panier
 */
export function CartAbandonmentCard({ dataPromise }: CartAbandonmentCardProps) {
	const data = use(dataPromise);

	// Pour le taux d'abandon, une baisse est une amélioration (moins d'abandons)
	const isImproved = data.evolution < 0;
	const evolutionColor = isImproved ? "text-green-600" : "text-red-600";
	const EvolutionIcon = isImproved ? TrendingDown : TrendingUp;

	return (
		<Card className="border-l-4 border-orange-500/50">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					Taux d'abandon de panier
				</CardTitle>
				<ShoppingCart className="h-4 w-4 text-muted-foreground" />
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
						<p className="font-medium text-red-600">{data.abandonedCarts}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Convertis</p>
						<p className="font-medium text-green-600">{data.convertedCarts}</p>
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
