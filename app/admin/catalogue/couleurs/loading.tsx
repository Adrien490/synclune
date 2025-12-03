import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ColorsDataTableSkeleton } from "@/modules/colors/components/admin/colors-data-table-skeleton";

/**
 * Loading state for colors management page
 * Structure alignee avec la vraie page:
 * - PageHeader avec bouton create
 * - DataTableToolbar
 * - ColorsDataTable
 */
export default function ColorsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des couleurs">
			<span className="sr-only">Chargement des couleurs...</span>

			{/* Page Header */}
			<PageHeader
				variant="compact"
				title="Couleurs"
				actions={<Skeleton className="h-10 w-36" />}
			/>

			<div className="space-y-6">
				{/* Toolbar skeleton */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
					<Skeleton className="h-10 flex-1 sm:max-w-md" />
					<Skeleton className="h-10 w-full sm:w-[180px]" />
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-10 w-10" />
				</div>

				{/* Data Table */}
				<ColorsDataTableSkeleton />
			</div>
		</div>
	);
}
