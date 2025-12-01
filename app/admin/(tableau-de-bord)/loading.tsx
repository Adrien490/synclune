import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	KpisSkeleton,
	ChartSkeleton,
} from "@/modules/dashboard/components/skeletons";

/**
 * Loading skeleton pour la page du dashboard
 * Structure alignee avec la vraie page:
 * - PageHeader
 * - Tabs + Controls (Period, Refresh)
 * - Sections accordeon (Performance, Operations, Stock, Tendances)
 */
export default function DashboardHomeLoading() {
	return (
		<>
			{/* Page Header */}
			<PageHeader
				title="Tableau de bord"
				description="Vue d'ensemble de votre boutique en temps reel"
				variant="compact"
			/>

			{/* Navigation et filtres */}
			<div
				className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
				role="status"
				aria-busy="true"
				aria-label="Chargement des controles"
			>
				{/* Tabs skeleton */}
				<div className="flex items-center gap-2">
					<Skeleton className="h-10 w-28" />
					<Skeleton className="h-10 w-20" />
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-20" />
				</div>

				{/* Controls skeleton */}
				<div className="flex items-center gap-3">
					{/* Period buttons */}
					<div className="hidden md:flex items-center gap-1">
						<Skeleton className="h-11 w-12" />
						<Skeleton className="h-11 w-12" />
						<Skeleton className="h-11 w-16" />
						<Skeleton className="h-11 w-16" />
					</div>
					{/* Select */}
					<Skeleton className="h-11 w-[180px]" />
					{/* Calendar button */}
					<Skeleton className="h-11 w-11 rounded-md" />
					{/* Refresh button */}
					<Skeleton className="h-11 w-11 rounded-md" />
				</div>
			</div>

			{/* Contenu principal - Accordeons */}
			<div className="space-y-4">
				{/* Section Performance (ouverte par defaut) */}
				<div className="border rounded-lg bg-card shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-4 py-3">
						<Skeleton className="w-9 h-9 rounded-lg" />
						<div className="flex-1">
							<Skeleton className="h-5 w-28 mb-1" />
							<Skeleton className="h-3 w-48" />
						</div>
						<Skeleton className="h-4 w-4" />
					</div>
					<div className="px-4 pb-4">
						<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs de performance" />
					</div>
				</div>

				{/* Section Operations (ouverte par defaut) */}
				<div className="border rounded-lg bg-card shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-4 py-3">
						<Skeleton className="w-9 h-9 rounded-lg" />
						<div className="flex-1">
							<Skeleton className="h-5 w-24 mb-1" />
							<Skeleton className="h-3 w-56" />
						</div>
						<Skeleton className="h-4 w-4" />
					</div>
					<div className="px-4 pb-4">
						<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs d'operations" />
					</div>
				</div>

				{/* Section Stock (ouverte par defaut) */}
				<div className="border rounded-lg bg-card shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-4 py-3">
						<Skeleton className="w-9 h-9 rounded-lg" />
						<div className="flex-1">
							<Skeleton className="h-5 w-16 mb-1" />
							<Skeleton className="h-3 w-40" />
						</div>
						<Skeleton className="h-4 w-4" />
					</div>
					<div className="px-4 pb-4">
						<KpisSkeleton count={4} ariaLabel="Chargement des indicateurs de stock" />
					</div>
				</div>

				{/* Section Tendances (ouverte par defaut) */}
				<div className="border rounded-lg bg-card shadow-sm overflow-hidden">
					<div className="flex items-center gap-3 px-4 py-3">
						<Skeleton className="w-9 h-9 rounded-lg" />
						<div className="flex-1">
							<Skeleton className="h-5 w-24 mb-1" />
							<Skeleton className="h-3 w-56" />
						</div>
						<Skeleton className="h-4 w-4" />
					</div>
					<div className="px-4 pb-4 space-y-6">
						<ChartSkeleton height={300} ariaLabel="Chargement du graphique des revenus" />
						<ChartSkeleton height={300} ariaLabel="Chargement des tendances annuelles" />
						<ChartSkeleton height={300} ariaLabel="Chargement des top produits" />
					</div>
				</div>
			</div>
		</>
	);
}
