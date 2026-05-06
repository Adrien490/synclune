import { PageHeader } from "@/shared/components/page-header";
import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";

/**
 * Loading skeleton pour la page du dashboard simplifié
 * Structure: alerts + 4 KPIs + graphique + liste commandes
 */
export default function DashboardLoading() {
	return (
		<>
			<PageHeader variant="compact" title="Tableau de bord" className="hidden md:block" />

			<div className="space-y-6">
				{/* DashboardAlerts placeholder (réserve la hauteur de l'alert si présente) */}
				<div className="min-h-[1px]" aria-hidden="true" />

				{/* 4 KPIs (Revenus, Commandes, Panier moyen, Clients) */}
				<KpisSkeleton count={4} compactCount={4} ariaLabel="Chargement des indicateurs" />

				{/* Graphique + Commandes */}
				<div className="grid gap-6 lg:grid-cols-2">
					<ChartSkeleton height={300} ariaLabel="Chargement du graphique des revenus" />
					<ListSkeleton itemCount={5} ariaLabel="Chargement des commandes récentes" />
				</div>
			</div>
		</>
	);
}
