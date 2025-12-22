import { PageHeader } from "@/shared/components/page-header";
import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";

/**
 * Loading skeleton pour la page du dashboard simplifié
 * Structure: 6 KPIs + graphique + liste commandes
 */
export default function DashboardLoading() {
	return (
		<>
			<PageHeader variant="compact" title="Tableau de bord" />

			<div className="space-y-6">
				{/* 6 KPIs */}
				<KpisSkeleton count={6} ariaLabel="Chargement des indicateurs" />

				{/* Graphique + Commandes */}
				<div className="grid gap-6 lg:grid-cols-2">
					<ChartSkeleton
						height={300}
						ariaLabel="Chargement du graphique des revenus"
					/>
					<ListSkeleton
						itemCount={5}
						ariaLabel="Chargement des commandes récentes"
					/>
				</div>
			</div>
		</>
	);
}
