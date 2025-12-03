import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { OverviewSectionSkeleton } from "@/modules/dashboard/components/skeletons";

/**
 * Loading skeleton pour la page du dashboard
 * Structure alignee avec la vraie page:
 * - PageHeader
 * - Tabs navigation (4 onglets)
 * - Bouton refresh
 * - Section Overview (par defaut)
 */
export default function DashboardLoading() {
	return (
		<>
			{/* Page Header */}
			<PageHeader variant="compact" title="Tableau de bord" />

			{/* Navigation tabs + controls */}
			<div
				className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
				role="status"
				aria-busy="true"
				aria-label="Chargement des controles"
			>
				{/* Tabs skeleton */}
				<div className="flex items-center gap-2">
					<Skeleton className="h-10 w-28" /> {/* Vue d'ensemble */}
					<Skeleton className="h-10 w-20" /> {/* Ventes */}
					<Skeleton className="h-10 w-24" /> {/* Inventaire */}
					<Skeleton className="h-10 w-20" /> {/* Clients */}
				</div>

				{/* Refresh button skeleton */}
				<Skeleton className="h-11 w-11 rounded-md" />
			</div>

			{/* Section par defaut (Overview) */}
			<OverviewSectionSkeleton />
		</>
	);
}
