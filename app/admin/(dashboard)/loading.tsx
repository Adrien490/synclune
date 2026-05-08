import { PageHeader } from "@/shared/components/page-header";
import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";

function SectionHeading({ id, label }: { id: string; label: string }) {
	return (
		<h2 id={id} className="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
			{label}
		</h2>
	);
}

export default function DashboardLoading() {
	return (
		<section role="status" aria-busy="true" aria-label="Chargement du tableau de bord">
			<span className="sr-only">Chargement du tableau de bord…</span>

			<PageHeader variant="compact" title="Tableau de bord" className="hidden md:block" />

			<div className="space-y-8">
				{/* DashboardAlerts placeholder (réserve la hauteur de l'alert si présente) */}
				<div className="min-h-[1px]" aria-hidden="true" />

				<section aria-labelledby="dashboard-section-performance" className="space-y-4">
					<SectionHeading id="dashboard-section-performance" label="Performance ventes" />
					<KpisSkeleton count={4} compactCount={4} ariaLabel="Chargement des indicateurs" />
				</section>

				<section aria-labelledby="dashboard-section-compliance" className="space-y-4">
					<SectionHeading id="dashboard-section-compliance" label="Conformité fiscale" />
					<div
						className="bg-muted/40 h-32 animate-pulse rounded-xl"
						aria-label="Chargement du suivi de seuil TVA"
					/>
				</section>

				<section aria-labelledby="dashboard-section-trends" className="space-y-4">
					<SectionHeading id="dashboard-section-trends" label="Tendances" />
					<ChartSkeleton
						heightClassName="h-60 sm:h-72 md:h-75"
						ariaLabel="Chargement du graphique des revenus"
					/>
				</section>

				<section aria-labelledby="dashboard-section-activity" className="space-y-4">
					<SectionHeading id="dashboard-section-activity" label="Commandes récentes" />
					<ListSkeleton itemCount={5} ariaLabel="Chargement des commandes récentes" />
				</section>
			</div>
		</section>
	);
}
