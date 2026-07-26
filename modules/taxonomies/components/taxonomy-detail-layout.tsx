import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Coque et carte de statistiques des pages détail de taxonomies.
 *
 * Les trois pages avaient la même grille deux colonnes et la même carte
 * « Statistiques » — à ceci près que couleurs et matériaux comptaient variantes
 * et produits distincts, là où les types de bijoux ventilent par statut. Une
 * liste de couples libellé/valeur couvre les deux formes.
 */

// ============================================================================
// COQUE DEUX COLONNES
// ============================================================================

interface TaxonomyDetailLayoutProps {
	header: ReactNode;
	/** Cartes de la colonne large (aperçu, informations, usage). */
	main: ReactNode;
	/** Cartes de la colonne étroite (statistiques). */
	side: ReactNode;
}

export function TaxonomyDetailLayout({ header, main, side }: TaxonomyDetailLayoutProps) {
	return (
		<div className="space-y-6">
			{header}

			<div className="grid gap-6 lg:grid-cols-3 lg:items-start">
				<div className="space-y-6 lg:col-span-2">{main}</div>
				<div className="space-y-6">{side}</div>
			</div>
		</div>
	);
}

// ============================================================================
// CARTE STATISTIQUES
// ============================================================================

export interface TaxonomyStat {
	label: string;
	value: number;
}

export function TaxonomyStatsCard({ stats }: { stats: ReadonlyArray<TaxonomyStat> }) {
	return (
		<Card>
			<StatsCardHeader />
			<CardContent>
				<dl className="grid gap-3 text-sm">
					{stats.map(({ label, value }) => (
						<div key={label} className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">{label}</dt>
							<dd className="font-medium">{value}</dd>
						</div>
					))}
				</dl>
			</CardContent>
		</Card>
	);
}

/** Fallback Suspense : mêmes libellés, valeurs en attente. */
export function TaxonomyStatsCardSkeleton({ labels }: { labels: ReadonlyArray<string> }) {
	return (
		<Card aria-busy="true">
			<StatsCardHeader />
			<CardContent>
				<dl className="grid gap-3 text-sm">
					{labels.map((label) => (
						<div key={label} className="flex items-center justify-between gap-3">
							<dt className="text-muted-foreground">{label}</dt>
							<dd>
								<Skeleton className="h-5 w-8" />
							</dd>
						</div>
					))}
				</dl>
			</CardContent>
		</Card>
	);
}

function StatsCardHeader() {
	return (
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				<BarChart3 className="size-5" aria-hidden="true" />
				Statistiques
			</CardTitle>
		</CardHeader>
	);
}
