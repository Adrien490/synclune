import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";

function SectionHeading({ id, label }: { id: string; label: string }) {
	return (
		<h2
			id={id}
			className="font-display text-foreground/85 sm:text-muted-foreground text-base font-normal tracking-tight sm:text-sm sm:italic"
		>
			{label}
		</h2>
	);
}

export default function DashboardLoading() {
	return (
		<section role="status" aria-busy="true" aria-label="Chargement du tableau de bord">
			<span className="sr-only">Chargement du tableau de bord…</span>

			<PageHeader
				variant="compact"
				title="Ton atelier"
				description="Voici ce qui se passe aujourd'hui"
				titleClassName="font-cursive text-3xl sm:text-4xl lg:text-5xl tracking-wide"
				actions={
					<div className="flex w-full items-center gap-2 md:hidden" aria-hidden="true">
						<Skeleton shape="rounded" className="h-11 flex-1" />
						<Skeleton shape="rounded" className="size-11" />
						<Skeleton shape="rounded" className="size-11" />
					</div>
				}
			/>

			<div className="space-y-8">
				{/* DashboardAlerts placeholder (réserve la hauteur de l'alert si présente) */}
				<div className="min-h-[1px]" aria-hidden="true" />

				<section aria-labelledby="dashboard-section-performance" className="space-y-4">
					<SectionHeading id="dashboard-section-performance" label="Performance ventes" />
					<KpisSkeleton count={4} compactCount={4} ariaLabel="Chargement des indicateurs" />
				</section>

				<section aria-labelledby="dashboard-section-compliance" className="space-y-4">
					<SectionHeading id="dashboard-section-compliance" label="Conformité fiscale" />
					<Skeleton
						shape="rounded"
						className="h-32 w-full"
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
					<SectionHeading id="dashboard-section-activity" label="Activité" />
					<div className="grid gap-6 lg:grid-cols-2">
						<ListSkeleton itemCount={5} ariaLabel="Chargement des commandes récentes" />
						<ListSkeleton itemCount={5} ariaLabel="Chargement du top produits" />
					</div>
				</section>
			</div>
		</section>
	);
}
