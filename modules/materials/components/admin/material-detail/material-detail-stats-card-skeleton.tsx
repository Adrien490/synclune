import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function MaterialDetailStatsCardSkeleton() {
	return (
		<Card aria-busy="true">
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
						<dd>
							<Skeleton className="h-5 w-8" />
						</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Produits distincts</dt>
						<dd>
							<Skeleton className="h-5 w-8" />
						</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}
