import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface MaterialDetailStatsCardProps {
	skusCount: number;
	productsCount: number;
}

export function MaterialDetailStatsCard({
	skusCount,
	productsCount,
}: MaterialDetailStatsCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<BarChart3 className="size-5" aria-hidden="true" />
					Statistiques
				</CardTitle>
			</CardHeader>
			<CardContent>
				<dl className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Variantes actives</dt>
						<dd className="font-medium">{skusCount}</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Produits distincts</dt>
						<dd className="font-medium">{productsCount}</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}
