import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface ProductTypeDetailStatsCardProps {
	total: number;
	counts: { public: number; draft: number; archived: number };
}

export function ProductTypeDetailStatsCard({ total, counts }: ProductTypeDetailStatsCardProps) {
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
						<dt className="text-muted-foreground">Total</dt>
						<dd className="font-medium">{total}</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Publics</dt>
						<dd className="font-medium">{counts.public}</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Brouillons</dt>
						<dd className="font-medium">{counts.draft}</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Archivés</dt>
						<dd className="font-medium">{counts.archived}</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}
