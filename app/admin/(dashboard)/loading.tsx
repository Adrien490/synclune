import { Skeleton } from "@/shared/components/ui/skeleton";
import { DashboardAmbientBackground } from "@/modules/dashboard/components/dashboard-ambient-background";
import {
	KpisSkeleton,
	ChartSkeleton,
	ListSkeleton,
} from "@/modules/dashboard/components/skeletons";
import { SectionHeading } from "./_components/section-heading";

export default function DashboardLoading() {
	return (
		<section
			role="status"
			aria-busy="true"
			aria-label="Chargement du tableau de bord"
			className="relative isolate"
		>
			<span className="sr-only">Chargement du tableau de bord…</span>

			<DashboardAmbientBackground />

			<header className="mb-4 md:mb-6">
				<div
					className="flex w-full flex-wrap items-center justify-start gap-3 md:justify-end"
					aria-hidden="true"
				>
					<div className="hidden w-full items-center gap-3 md:flex md:w-auto md:justify-end">
						<Skeleton shape="rounded" className="h-9 w-32" />
						<Skeleton shape="rounded" className="h-9 w-24" />
						<Skeleton shape="rounded" className="h-9 w-28" />
					</div>
					<div className="flex w-full items-center gap-2 md:hidden">
						<Skeleton shape="rounded" className="h-11 flex-1" />
						<Skeleton shape="rounded" className="size-11" />
						<Skeleton shape="rounded" className="size-11" />
					</div>
				</div>
			</header>

			<div className="space-y-8">
				{/* DashboardAlerts placeholder (réserve la hauteur de l'alert si présente) */}
				<div className="min-h-[1px]" aria-hidden="true" />

				<section aria-labelledby="dashboard-section-performance" className="space-y-4">
					<SectionHeading
						id="dashboard-section-performance"
						label="Performance ventes"
						accent="star"
					/>
					<KpisSkeleton count={4} compactCount={4} ariaLabel="Chargement des indicateurs" />
				</section>

				<section aria-labelledby="dashboard-section-compliance" className="space-y-4">
					<SectionHeading
						id="dashboard-section-compliance"
						label="Conformité fiscale"
						accent="circle"
					/>
					<Skeleton
						shape="rounded"
						className="h-32 w-full"
						aria-label="Chargement du suivi de seuil TVA"
					/>
				</section>

				<section aria-labelledby="dashboard-section-trends" className="space-y-4">
					<SectionHeading id="dashboard-section-trends" label="Tendances" accent="arrow" />
					<ChartSkeleton
						heightClassName="h-60 sm:h-72 md:h-75"
						ariaLabel="Chargement du graphique des revenus"
					/>
				</section>

				<section aria-labelledby="dashboard-section-activity" className="space-y-4">
					<SectionHeading id="dashboard-section-activity" label="Activité" accent="heart" />
					<div className="grid gap-6 lg:grid-cols-2">
						<ListSkeleton itemCount={5} ariaLabel="Chargement des commandes récentes" />
						<ListSkeleton itemCount={5} ariaLabel="Chargement du top produits" />
					</div>
				</section>
			</div>
		</section>
	);
}
